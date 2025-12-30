const axios = require("axios");
const express = require("express");
const jwt = require("jsonwebtoken");
const { pool } = require("./db");
const { cfg } = require("./config");
const { authJwt } = require("./auth");
const {
  badRequest,
  notFound,
  conflict,
  forbidden,
  unauthorized,
} = require("./errors");
const { orderCreateSchema } = require("./validators");

const r = express.Router();

async function getCustomer(id) {
  try {
    const res = await axios.get(
      `${cfg.customersApiBase}/internal/customers/${id}`,
      { headers: { Authorization: `Bearer ${cfg.serviceToken}` } }
    );
    return res.data;
  } catch {
    return null;
  }
}

function authAny(req, res, next) {
  const h = req.headers.authorization || "";
  const [type, token] = h.split(" ");

  if (type !== "Bearer" || !token)
    return next(unauthorized("UNAUTHORIZED", "No autorizado"));

  if (token === cfg.serviceToken) return next();

  try {
    const payload = jwt.verify(token, cfg.jwtSecret);
    req.user = payload;
    return next();
  } catch {
    return next(unauthorized("UNAUTHORIZED", "No autorizado"));
  }
}

r.post("/orders", authAny, async (req, res, next) => {
  try {
    const parsed = orderCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        badRequest(
          "VALIDATION_ERROR",
          "Datos de la orden inválidos",
          parsed.error.flatten().fieldErrors
        )
      );
    }

    const customer = await getCustomer(parsed.data.customer_id);
    if (!customer) {
      return next(
        notFound(
          "CUSTOMER_NOT_FOUND",
          `El cliente ${parsed.data.customer_id} no existe`
        )
      );
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let total = 0;

      for (const it of parsed.data.items) {
        const [[prod]] = await conn.execute(
          "SELECT price_cents, stock FROM products WHERE id=? FOR UPDATE",
          [it.product_id]
        );

        if (!prod) {
          throw notFound(
            "PRODUCT_NOT_FOUND",
            `El producto ${it.product_id} no existe`
          );
        }

        if (prod.stock < it.qty) {
          throw conflict(
            "INSUFFICIENT_STOCK",
            `Stock insuficiente para el producto ${it.product_id}`
          );
        }

        total += prod.price_cents * it.qty;
      }

      const [orderRes] = await conn.execute(
        "INSERT INTO orders (customer_id, total_cents, status) VALUES (?,?, 'CREATED')",
        [parsed.data.customer_id, total]
      );

      for (const it of parsed.data.items) {
        const [[prod]] = await conn.execute(
          "SELECT price_cents FROM products WHERE id=?",
          [it.product_id]
        );

        await conn.execute(
          "INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES (?,?,?,?,?)",
          [
            orderRes.insertId,
            it.product_id,
            it.qty,
            prod.price_cents,
            prod.price_cents * it.qty,
          ]
        );

        await conn.execute("UPDATE products SET stock=stock-? WHERE id=?", [
          it.qty,
          it.product_id,
        ]);
      }

      await conn.commit();

      return res.status(201).json({
        id: orderRes.insertId,
        status: "CREATED",
        total_cents: total,
      });
    } catch (e) {
      await conn.rollback();
      return next(e);
    } finally {
      conn.release();
    }
  } catch (e) {
    return next(e);
  }
});

r.post("/orders/:id/confirm", authAny, async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isFinite(orderId)) {
      return next(badRequest("INVALID_ID", "El id de la orden es inválido"));
    }

    const key = req.headers["x-idempotency-key"];
    if (!key || typeof key !== "string") {
      return next(
        badRequest(
          "MISSING_IDEMPOTENCY_KEY",
          "El encabezado X-Idempotency-Key es obligatorio"
        )
      );
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[existing]] = await conn.execute(
        "SELECT response_body FROM idempotency_keys WHERE idempotency_key=? FOR UPDATE",
        [key]
      );

      if (existing) {
        await conn.commit();
        const body =
          typeof existing.response_body === "string"
            ? JSON.parse(existing.response_body)
            : existing.response_body;
        return res.status(200).json(body);
      }

      const [[order]] = await conn.execute(
        "SELECT id, status, total_cents, created_at FROM orders WHERE id=? FOR UPDATE",
        [orderId]
      );

      if (!order) {
        await conn.rollback();
        return next(
          notFound("ORDER_NOT_FOUND", `La orden ${orderId} no existe`)
        );
      }

      if (order.status === "CONFIRMED") {
        const [items] = await conn.execute(
          "SELECT product_id, qty, unit_price_cents, subtotal_cents FROM order_items WHERE order_id=?",
          [orderId]
        );

        const responseBody = {
          success: true,
          data: {
            id: orderId,
            status: "CONFIRMED",
            total_cents: order.total_cents,
            items,
          },
        };

        await conn.execute(
          "INSERT INTO idempotency_keys (idempotency_key, order_id, response_body) VALUES (?,?,?)",
          [key, orderId, JSON.stringify(responseBody)]
        );

        await conn.commit();
        return res.status(200).json(responseBody);
      }

      if (order.status !== "CREATED") {
        await conn.rollback();
        return next(
          forbidden(
            "ORDER_NOT_CONFIRMABLE",
            "Solo se pueden confirmar órdenes en estado CREATED"
          )
        );
      }

      await conn.execute("UPDATE orders SET status='CONFIRMED' WHERE id=?", [
        orderId,
      ]);

      const [items] = await conn.execute(
        "SELECT product_id, qty, unit_price_cents, subtotal_cents FROM order_items WHERE order_id=?",
        [orderId]
      );

      const responseBody = {
        success: true,
        data: {
          id: orderId,
          status: "CONFIRMED",
          total_cents: order.total_cents,
          items,
        },
      };

      await conn.execute(
        "INSERT INTO idempotency_keys (idempotency_key, order_id, response_body) VALUES (?,?,?)",
        [key, orderId, JSON.stringify(responseBody)]
      );

      await conn.commit();
      return res.status(200).json(responseBody);
    } catch (e) {
      await conn.rollback();
      return next(e);
    } finally {
      conn.release();
    }
  } catch (e) {
    return next(e);
  }
});

r.post("/orders/:id/cancel", authAny, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return next(badRequest("INVALID_ID", "El id de la orden es inválido"));
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]] = await conn.execute(
      "SELECT status, created_at FROM orders WHERE id=? FOR UPDATE",
      [id]
    );

    if (!order) {
      await conn.rollback();
      return next(notFound("ORDER_NOT_FOUND", `La orden ${id} no existe`));
    }

    if (order.status === "CANCELED") {
      await conn.rollback();
      return res.json({ success: true, status: "CANCELED" });
    }

    await conn.execute("UPDATE orders SET status='CANCELED' WHERE id=?", [id]);

    const [items] = await conn.execute(
      "SELECT product_id, qty FROM order_items WHERE order_id=?",
      [id]
    );

    for (const it of items) {
      await conn.execute("UPDATE products SET stock=stock+? WHERE id=?", [
        it.qty,
        it.product_id,
      ]);
    }

    await conn.commit();
    res.json({ success: true, status: "CANCELED" });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

r.get("/orders/:id", authAny, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return next(badRequest("INVALID_ID", "El id de la orden es inválido"));
    }

    const [[order]] = await pool.execute(
      "SELECT id, customer_id, status, total_cents, created_at FROM orders WHERE id=?",
      [id]
    );

    if (!order) {
      return next(notFound("ORDER_NOT_FOUND", `La orden ${id} no existe`));
    }

    const [items] = await pool.execute(
      "SELECT product_id, qty, unit_price_cents, subtotal_cents FROM order_items WHERE order_id=?",
      [id]
    );

    res.json({ ...order, items });
  } catch (e) {
    next(e);
  }
});

r.get("/orders", authAny, async (req, res, next) => {
  try {
    const status = (req.query.status || "").trim().toUpperCase();
    const from = (req.query.from || "").trim();
    const to = (req.query.to || "").trim();
    const cursor = Number(req.query.cursor || 0);
    const limit = Number(req.query.limit || 20);

    if (!Number.isFinite(cursor) || cursor < 0) {
      return next(
        badRequest("INVALID_CURSOR", "El parámetro cursor es inválido")
      );
    }

    if (!Number.isFinite(limit) || limit <= 0 || limit > 100) {
      return next(
        badRequest(
          "INVALID_LIMIT",
          "El parámetro limit debe estar entre 1 y 100"
        )
      );
    }

    const allowedStatus = ["CREATED", "CONFIRMED", "CANCELED"];
    if (status && !allowedStatus.includes(status)) {
      return next(
        badRequest(
          "INVALID_STATUS",
          "El parámetro status debe ser CREATED, CONFIRMED o CANCELED"
        )
      );
    }

    let sql = `
      SELECT id, customer_id, status, total_cents, created_at
      FROM orders
      WHERE id > ?
    `;
    const params = [cursor];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (from) {
      sql += ` AND created_at >= ?`;
      params.push(from);
    }

    if (to) {
      sql += ` AND created_at <= ?`;
      params.push(to);
    }

    sql += ` ORDER BY id LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.execute(sql, params);

    return res.json({
      data: rows,
      next_cursor: rows.length ? rows[rows.length - 1].id : null,
    });
  } catch (e) {
    return next(e);
  }
});

module.exports = r;
