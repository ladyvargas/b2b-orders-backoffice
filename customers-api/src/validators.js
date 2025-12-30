const { z } = require("zod");

const customerCreateSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("El email no es válido"),
  phone: z.string().optional()
});

const customerUpdateSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
  email: z.string().email("El email no es válido").optional(),
  phone: z.string().optional()
}).refine(
  (v) => Object.keys(v).length > 0,
  "Debe enviar al menos un campo para actualizar"
);

module.exports = {
  customerCreateSchema,
  customerUpdateSchema
};
