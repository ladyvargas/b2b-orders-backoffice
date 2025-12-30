require("dotenv").config();
const axios = require("axios");

const CUSTOMERS_API = process.env.CUSTOMERS_API_BASE;
const ORDERS_API = process.env.ORDERS_API_BASE;
const SERVICE_TOKEN = process.env.SERVICE_TOKEN;

exports.main = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const { customer_id, items, idempotency_key, correlation_id } = body;

    if (!customer_id || !items || !idempotency_key) {
      return response(400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "customer_id, items e idempotency_key son obligatorios",
        },
      });
    }

    let customer;
    try {
      const res = await axios.get(
        `${CUSTOMERS_API}/internal/customers/${customer_id}`,
        {
          headers: {
            Authorization: `Bearer ${SERVICE_TOKEN}`,
          },
        }
      );
      customer = res.data;
    } catch (err) {
      if (err.response) {
        if (err.response.status === 404) {
          return response(404, {
            error: {
              code: "CUSTOMER_NOT_FOUND",
              message: `El cliente ${customer_id} no existe`,
            },
          });
        }

        if (err.response.status === 401) {
          return response(502, {
            error: {
              code: "CUSTOMERS_API_UNAUTHORIZED",
              message: "No autorizado para consultar Customers API",
            },
          });
        }
      }

      // Error de red, timeout, DNS, etc.
      return response(502, {
        error: {
          code: "CUSTOMERS_API_ERROR",
          message: "Error al comunicarse con Customers API",
        },
      });
    }

    let order;
    try {
      const res = await axios.post(
        `${ORDERS_API}/orders`,
        { customer_id, items },
        {
          headers: {
            Authorization: `Bearer ${SERVICE_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      order = res.data;
    } catch (e) {
      return response(400, {
        error: {
          code: "ORDER_CREATION_FAILED",
          message: "No se pudo crear la orden",
          details: e.response?.data || null,
        },
      });
    }

    let confirmed;
    console.log("ORDERS_API", `${ORDERS_API}/orders/${order.id}/confirm`);
    console.log("SERVICE_TOKEN", SERVICE_TOKEN);
    try {
      const res = await axios.post(
        `${ORDERS_API}/orders/${order.id}/confirm`,
        {},
        {
          headers: {
            Authorization: `Bearer ${SERVICE_TOKEN}`,
            "X-Idempotency-Key": idempotency_key,
          },
        }
      );
      confirmed = res.data;
    } catch (e) {
      return response(409, {
        error: {
          code: "ORDER_CONFIRMATION_FAILED",
          message: "No se pudo confirmar la orden",
          details: e.response?.data || null,
        },
      });
    }

    return response(201, {
      success: true,
      correlationId: correlation_id || null,
      data: {
        customer,
        order: confirmed.data,
      },
    });
  } catch (err) {
    console.error("LAMBDA_ERROR", err);

    return response(500, {
      error: {
        code: "INTERNAL_ERROR",
        message: "Error interno del orquestador",
      },
    });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
