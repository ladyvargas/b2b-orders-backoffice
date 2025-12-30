const { cfg } = require("./config");
const { buildApp } = require("./app");
const { ping } = require("./db");

async function main() {
  await ping();
  const app = buildApp();
  app.listen(cfg.port);
}

main().catch(() => process.exit(1));
