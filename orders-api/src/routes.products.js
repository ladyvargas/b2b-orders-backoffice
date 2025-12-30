const express = require("express");
const { pool } = require("./db");
const { authJwt } = require("./auth");
const { badRequest, conflict, notFound } = require("./errors");
const { z } = require("zod");

const r = express.Router();

const productCreateSchema = z.object({
  sku: z.string().min(2),
  name: z.string().min(2),
  price_cents: z.number().int().positive(),
  stock: z.number().int().nonnegative()
});

const productPatchSchema = z
  .object({
    price_cents: z.number().int().positive().optional(),
    stock: z.number().int().nonnegative().optional()
  })
  .refine(d => Object.keys(d).length > 0, {
    message: "Debe enviarse al menos un campo para actualizar"
  });


r.post("/products", authJwt, async (req, res, next) => {
  const parsed = productCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(
      badRequest(
        "VALIDATION_ERROR",
        "Datos del producto inválidos",
        parsed.error.flatten().fieldErrors
      )
    );
  }

  try {
    const { sku, name, price_cents, stock } = parsed.data;

    const [result] = await pool.execute(
      "INSERT INTO products (sku, name, price_cents, stock) VALUES (?,?,?,?)",
      [sku, name, price_cents, stock]
    );

    const [[row]] = await pool.execute(
      "SELECT id, sku, name, price_cents, stock FROM products WHERE id=?",
      [result.insertId]
    );

    return res.status(201).json(row);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return next(
        conflict("SKU_ALREADY_EXISTS", `El SKU ${req.body.sku} ya existe`)
      );
    }
    return next(e);
  }
});

r.get("/products/:id", authJwt, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return next(badRequest("INVALID_ID", "El id del producto es inválido"));
  }

  const [[row]] = await pool.execute(
    "SELECT id, sku, name, price_cents, stock FROM products WHERE id=?",
    [id]
  );

  if (!row) {
    return next(notFound("PRODUCT_NOT_FOUND", `El producto ${id} no existe`));
  }

  return res.json(row);
});

r.get("/products", authJwt, async (req, res, next) => {
  try {
    const search = (req.query.search || "").trim();
    const cursor = Number(req.query.cursor || 0);
    const limit = Number(req.query.limit || 20);

    if (!Number.isFinite(cursor) || cursor < 0) {
      return next(badRequest("INVALID_CURSOR", "El parámetro cursor es inválido"));
    }

    if (!Number.isFinite(limit) || limit <= 0 || limit > 100) {
      return next(badRequest("INVALID_LIMIT", "El parámetro limit debe estar entre 1 y 100"));
    }

    let sql = `
      SELECT id, sku, name, price_cents, stock
      FROM products
      WHERE id > ?
    `;
    const params = [cursor];

    if (search) {
      sql += ` AND (sku LIKE ? OR name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term);
    }

    sql += ` ORDER BY id LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.execute(sql, params);

    res.json({
      data: rows,
      next_cursor: rows.length ? rows[rows.length - 1].id : null
    });
  } catch (e) {
    next(e);
  }
});

r.patch("/products/:id", authJwt, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return next(badRequest("INVALID_ID", "El id del producto es inválido"));
  }

  const parsed = productPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(
      badRequest(
        "VALIDATION_ERROR",
        "Datos de actualización inválidos",
        parsed.error.flatten().fieldErrors
      )
    );
  }

  const [[existing]] = await pool.execute(
    "SELECT id FROM products WHERE id=?",
    [id]
  );

  if (!existing) {
    return next(notFound("PRODUCT_NOT_FOUND", `El producto ${id} no existe`));
  }

  const fields = [];
  const values = [];

  if (parsed.data.price_cents !== undefined) {
    fields.push("price_cents=?");
    values.push(parsed.data.price_cents);
  }

  if (parsed.data.stock !== undefined) {
    fields.push("stock=?");
    values.push(parsed.data.stock);
  }

  values.push(id);

  await pool.execute(
    `UPDATE products SET ${fields.join(", ")} WHERE id=?`,
    values
  );

  const [[row]] = await pool.execute(
    "SELECT id, sku, name, price_cents, stock FROM products WHERE id=?",
    [id]
  );

  return res.json(row);
});

module.exports = r;
