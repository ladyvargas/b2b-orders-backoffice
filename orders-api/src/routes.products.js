const express = require("express");
const { pool } = require("./db");
const { authJwt } = require("./auth");
const { badRequest, conflict, notFound } = require("./errors");
const { z } = require("zod");

const r = express.Router();

const productSchema = z.object({
  sku: z.string().min(2),
  name: z.string().min(2),
  price_cents: z.number().int().positive(),
  stock: z.number().int().nonnegative()
});

r.post("/products", authJwt, async (req, res, next) => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        badRequest(
          "VALIDATION_ERROR",
          "Datos del producto inválidos",
          parsed.error.flatten().fieldErrors
        )
      );
    }

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
        conflict(
          "SKU_ALREADY_EXISTS",
          `El producto con SKU ${req.body.sku} ya existe`
        )
      );
    }
    return next(e);
  }
});

r.get("/products/:id", authJwt, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return next(badRequest("INVALID_ID", "El id del producto es inválido"));
    }

    const [[row]] = await pool.execute(
      "SELECT id, sku, name, price_cents, stock FROM products WHERE id=?",
      [id]
    );

    if (!row) {
      return next(
        notFound(
          "PRODUCT_NOT_FOUND",
          `El producto ${id} no existe`
        )
      );
    }

    return res.json(row);
  } catch (e) {
    return next(e);
  }
});

module.exports = r;
