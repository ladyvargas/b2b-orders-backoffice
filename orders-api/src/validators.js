const { z } = require("zod");

const productCreateSchema = z.object({
  sku: z
    .string({
      required_error: "El SKU es obligatorio",
      invalid_type_error: "El SKU debe ser un texto"
    })
    .trim()
    .min(2, "El SKU debe tener al menos 2 caracteres")
    .max(50, "El SKU no puede superar 50 caracteres"),

  name: z
    .string({
      required_error: "El nombre es obligatorio",
      invalid_type_error: "El nombre debe ser un texto"
    })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(150, "El nombre no puede superar 150 caracteres"),

  price_cents: z
    .number({
      required_error: "El precio es obligatorio",
      invalid_type_error: "El precio debe ser un número entero"
    })
    .int("El precio debe ser un número entero")
    .positive("El precio debe ser mayor a cero"),

  stock: z
    .number({
      required_error: "El stock es obligatorio",
      invalid_type_error: "El stock debe ser un número entero"
    })
    .int("El stock debe ser un número entero")
    .min(0, "El stock no puede ser negativo")
});

const productPatchSchema = z
  .object({
    name: z
      .string({
        invalid_type_error: "El nombre debe ser un texto"
      })
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(150, "El nombre no puede superar 150 caracteres")
      .optional(),

    price_cents: z
      .number({
        invalid_type_error: "El precio debe ser un número entero"
      })
      .int("El precio debe ser un número entero")
      .positive("El precio debe ser mayor a cero")
      .optional(),

    stock: z
      .number({
        invalid_type_error: "El stock debe ser un número entero"
      })
      .int("El stock debe ser un número entero")
      .min(0, "El stock no puede ser negativo")
      .optional()
  })
  .refine(data => Object.keys(data).length > 0, {
    message: "Debe enviarse al menos un campo para actualizar"
  });

const listSchema = z.object({
  search: z
    .string({
      invalid_type_error: "El parámetro search debe ser texto"
    })
    .trim()
    .min(1, "El parámetro search no puede estar vacío")
    .optional(),

  cursor: z
    .string({
      invalid_type_error: "El cursor debe ser un texto"
    })
    .trim()
    .optional(),

  limit: z
    .coerce
    .number({
      invalid_type_error: "El límite debe ser un número"
    })
    .int("El límite debe ser un número entero")
    .min(1, "El límite mínimo es 1")
    .max(100, "El límite máximo es 100")
    .optional()
});

const orderCreateSchema = z.object({
  customer_id: z
    .number({
      required_error: "El customer_id es obligatorio",
      invalid_type_error: "El customer_id debe ser numérico"
    })
    .int("El customer_id debe ser un entero")
    .positive("El customer_id debe ser mayor a cero"),

  items: z
    .array(
      z.object({
        product_id: z
          .number({
            required_error: "El product_id es obligatorio",
            invalid_type_error: "El product_id debe ser numérico"
          })
          .int("El product_id debe ser un entero")
          .positive("El product_id debe ser mayor a cero"),

        qty: z
          .number({
            required_error: "La cantidad es obligatoria",
            invalid_type_error: "La cantidad debe ser numérica"
          })
          .int("La cantidad debe ser un número entero")
          .positive("La cantidad debe ser mayor a cero")
      })
    )
    .min(1, "Debe existir al menos un producto en la orden")
});

module.exports = {
  productCreateSchema,
  productPatchSchema,
  listSchema,
  orderCreateSchema
};
