const dotenv = require("dotenv");
dotenv.config();

const cfg = {
  port: Number(process.env.PORT || 3001),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
  jwtSecret: process.env.JWT_SECRET,
  serviceToken: process.env.SERVICE_TOKEN
};

module.exports = { cfg };
