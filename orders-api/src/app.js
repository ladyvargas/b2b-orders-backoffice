const express = require("express");
const products = require("./routes.products");
const orders = require("./routes.orders");
const { HttpError } = require("./errors");

function buildApp() {
  const app = express();

  app.use(express.json());

  app.get("/health", (_, res) => res.json({ ok: true }));

  app.use(products);
  app.use(orders);

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Ruta no encontrada"
      }
    });
  });

  app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details
        }
      });
    }

    console.error(err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Error interno del servidor"
      }
    });
  });

  return app;
}

module.exports = { buildApp };
