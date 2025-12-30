const { z } = require("zod");

const orchestratorSchema = z.object({
  customer_id: z.number().int().positive(),
  items: z.array(
    z.object({
      product_id: z.number().int().positive(),
      qty: z.number().int().positive()
    })
  ).min(1),
  idempotency_key: z.string().min(5),
  correlation_id: z.string().optional()
});

module.exports = { orchestratorSchema };
