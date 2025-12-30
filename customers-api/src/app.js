const express = require("express");
const { HttpError } = require("./errors");
const customersRoutes = require("./routes.customers");
const authRoutes = require("./auth.routes");

function buildApp() {
  const app = express();
  app.use(express.json());

  app.get("/health", (req, res) => res.json({ ok: true }));

  app.use(authRoutes);
  app.use(customersRoutes);

  app.use((req, res) =>
    res.status(404).json({
      error: {
        codigo: "NOT_FOUND",
        mensaje: "La ruta solicitada no existe"
      }
    })
  );

  app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({
        error: {
          codigo: err.codigo,
          mensaje: err.message,
          detalles: err.detalles
        }
      });
    }

    res.status(500).json({
      error: {
        codigo: "INTERNAL_ERROR",
        mensaje: "Ocurrió un error interno"
      }
    });
  });

  return app;
}

module.exports = { buildApp };
