const dotenv = require("dotenv");
dotenv.config();

const cfg = {
  port: Number(process.env.PORT || 3002),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
  jwtSecret: process.env.JWT_SECRET,
  customersApiBase: process.env.CUSTOMERS_API_BASE,
  serviceToken: process.env.SERVICE_TOKEN,
  idempotencyTtlMinutes: Number(process.env.IDEMPOTENCY_TTL_MINUTES || 60)
};

module.exports = { cfg };
