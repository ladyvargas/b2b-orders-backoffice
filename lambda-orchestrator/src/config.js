require("dotenv").config();

const cfg = {
  customersApiBase: process.env.CUSTOMERS_API_BASE,
  ordersApiBase: process.env.ORDERS_API_BASE,
  serviceToken: process.env.SERVICE_TOKEN
};

module.exports = { cfg };
