const express = require("express");
const { pool } = require("./db");
const { authJwt, authServiceToken } = require("./auth");
const { badRequest, notFound, conflict } = require("./errors");
const { customerCreateSchema, customerUpdateSchema } = require("./validators");

const r = express.Router();

r.post("/customers", authJwt, async (req, res, next) => {
  const parsed = customerCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(
      badRequest(
        "VALIDATION_ERROR",
        "Datos del cliente inválidos",
        parsed.error.flatten().fieldErrors
      )
    );
  }

  try {
    const { name, email, phone } = parsed.data;

    const [result] = await pool.execute(
      "INSERT INTO customers (name, email, phone) VALUES (?,?,?)",
      [name, email, phone || null]
    );

    const [[row]] = await pool.execute(
      "SELECT id, name, email, phone, created_at FROM customers WHERE id=?",
      [result.insertId]
    );

    return res.status(201).json(row);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return next(
        conflict(
          "EMAIL_ALREADY_EXISTS",
          `Ya existe un cliente con el email ${req.body.email}`
        )
      );
    }
    return next(e);
  }
});

r.get("/customers/:id", authJwt, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return next(badRequest("INVALID_ID", "El id del cliente es inválido"));
    }

    const [[row]] = await pool.execute(
      "SELECT id, name, email, phone, created_at FROM customers WHERE id=?",
      [id]
    );

    if (!row) {
      return next(
        notFound(
          "CUSTOMER_NOT_FOUND",
          `El cliente ${id} no existe`
        )
      );
    }

    return res.json(row);
  } catch (e) {
    return next(e);
  }
});

r.get("/customers", authJwt, async (req, res, next) => {
  try {
    const search = (req.query.search || "").trim();
    const limit = Number(req.query.limit || 20);
    const cursor = Number(req.query.cursor || 0);

    if (!Number.isFinite(limit) || limit <= 0 || limit > 100) {
      return next(
        badRequest("INVALID_LIMIT", "El parámetro limit debe estar entre 1 y 100")
      );
    }

    if (!Number.isFinite(cursor) || cursor < 0) {
      return next(
        badRequest("INVALID_CURSOR", "El parámetro cursor es inválido")
      );
    }

    const term = `%${search}%`;

    const [rows] = await pool.execute(
      `
      SELECT id, name, email, phone, created_at
      FROM customers
      WHERE id > ?
        AND (? = '' OR name LIKE ? OR email LIKE ? OR phone LIKE ?)
      ORDER BY id
      LIMIT ?
      `,
      [cursor, search, term, term, term, limit]
    );

    return res.json({
      data: rows,
      next_cursor: rows.length ? rows[rows.length - 1].id : null
    });
  } catch (e) {
    return next(e);
  }
});

r.put("/customers/:id", authJwt, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return next(badRequest("INVALID_ID", "El id del cliente es inválido"));
    }

    const parsed = customerUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        badRequest(
          "VALIDATION_ERROR",
          "Datos del cliente inválidos",
          parsed.error.flatten().fieldErrors
        )
      );
    }

    const [[existing]] = await pool.execute(
      "SELECT id FROM customers WHERE id=?",
      [id]
    );

    if (!existing) {
      return next(
        notFound(
          "CUSTOMER_NOT_FOUND",
          `El cliente ${id} no existe`
        )
      );
    }

    const fields = [];
    const values = [];

    if (parsed.data.name !== undefined) {
      fields.push("name=?");
      values.push(parsed.data.name);
    }
    if (parsed.data.email !== undefined) {
      fields.push("email=?");
      values.push(parsed.data.email);
    }
    if (parsed.data.phone !== undefined) {
      fields.push("phone=?");
      values.push(parsed.data.phone || null);
    }

    values.push(id);

    await pool.execute(
      `UPDATE customers SET ${fields.join(", ")} WHERE id=?`,
      values
    );

    const [[row]] = await pool.execute(
      "SELECT id, name, email, phone, created_at FROM customers WHERE id=?",
      [id]
    );

    return res.json(row);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return next(
        conflict(
          "EMAIL_ALREADY_EXISTS",
          `Ya existe un cliente con el email ${req.body.email}`
        )
      );
    }
    return next(e);
  }
});

r.delete("/customers/:id", authJwt, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return next(badRequest("INVALID_ID", "El id del cliente es inválido"));
    }

    const [result] = await pool.execute(
      "DELETE FROM customers WHERE id=?",
      [id]
    );

    if (result.affectedRows === 0) {
      return next(
        notFound(
          "CUSTOMER_NOT_FOUND",
          `El cliente ${id} no existe`
        )
      );
    }

    return res.json({ success: true });
  } catch (e) {
    return next(e);
  }
});

r.get("/internal/customers/:id", authServiceToken, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return next(badRequest("INVALID_ID", "El id del cliente es inválido"));
    }

    const [[row]] = await pool.execute(
      "SELECT id, name, email, phone FROM customers WHERE id=?",
      [id]
    );

    if (!row) {
      return next(
        notFound(
          "CUSTOMER_NOT_FOUND",
          `El cliente ${id} no existe`
        )
      );
    }

    return res.json(row);
  } catch (e) {
    return next(e);
  }
});

module.exports = r;
