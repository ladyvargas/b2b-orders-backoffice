const { cfg } = require("./config");
const { buildApp } = require("./app");
const { pool } = require("./db");

async function start() {
  try {
    const app = buildApp();
    app.listen(cfg.port, () => {
      console.log(`Orders API escuchando en puerto ${cfg.port}`);
    });
  } catch (e) {
    console.error("Error al iniciar Orders API", e);
    process.exit(1);
  }
}

start();
