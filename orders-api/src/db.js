const mysql = require("mysql2/promise");
const { cfg } = require("./config");

const pool = mysql.createPool({
  host: cfg.db.host,
  port: cfg.db.port,
  user: cfg.db.user,
  password: cfg.db.password,
  database: cfg.db.database,
  waitForConnections: true,
  connectionLimit: 10
});

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function ping(retries = 20, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      return true;
    } catch {
      await sleep(delayMs);
    }
  }
  throw new Error("MySQL not ready");
}

module.exports = { pool, ping };
