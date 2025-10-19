import { z } from 'zod';

/**
 * Esquemas de validación Zod para el módulo de Foros
 */

// Enum para el estado del foro (coincide con la base de datos CHAR(1))
export const estadoForoEnum = z.enum(['A', 'I']);

// Schema para crear un nuevo foro
export const crearForoSchema = z.object({
  titulo: z
    .string()
    .min(1, 'El título no puede estar vacío')
    .max(200, 'El título no puede exceder 200 caracteres')
    .trim(),

  descripcion: z
    .string()
    .min(1, 'La descripción no puede estar vacía')
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .trim(),

  id_categoria: z
    .number()
    .int('El ID de categoría debe ser un número entero')
    .positive('El ID de categoría debe ser mayor a 0'),

  estado: estadoForoEnum.optional().default('A'),

  anio_evento: z
    .number()
    .int('El año del evento debe ser un número entero')
    .min(2020, 'El año del evento debe ser mayor a 2020')
    .max(2030, 'El año del evento no puede ser mayor a 2030')
    .optional(),

  imagen_url: z
    .string()
    .url('La URL de la imagen debe ser válida')
    .max(255, 'La URL de la imagen no puede exceder 255 caracteres')
    .optional()
});

// Schema para actualizar un foro
export const actualizarForoSchema = z.object({
  titulo: z
    .string()
    .min(1, 'El título no puede estar vacío')
    .max(200, 'El título no puede exceder 200 caracteres')
    .trim()
    .optional(),

  descripcion: z
    .string()
    .min(1, 'La descripción no puede estar vacía')
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .trim()
    .optional(),

  id_categoria: z
    .number()
    .int('El ID de categoría debe ser un número entero')
    .positive('El ID de categoría debe ser mayor a 0')
    .optional(),

  estado: estadoForoEnum.optional(),

  anio_evento: z
    .number()
    .int('El año del evento debe ser un número entero')
    .min(2020, 'El año del evento debe ser mayor a 2020')
    .max(2030, 'El año del evento no puede ser mayor a 2030')
    .optional(),

  imagen_url: z
    .string()
    .url('La URL de la imagen debe ser válida')
    .max(255, 'La URL de la imagen no puede exceder 255 caracteres')
    .optional()
});

// Schema para filtros de foros
export const filtrosForosSchema = z.object({
  estado: estadoForoEnum.optional(),
  
  categoria: z
    .string()
    .min(1, 'La categoría no puede estar vacía')
    .max(100, 'La categoría no puede exceder 100 caracteres')
    .trim()
    .optional(),

  fecha_creacion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de creación debe tener el formato YYYY-MM-DD')
    .refine((date) => {
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime());
    }, 'La fecha de creación debe ser una fecha válida')
    .optional(),

  anio_evento: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'El año del evento debe ser un número entero')
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .refine((val) => !val || (val >= 2020 && val <= 2030), 'El año del evento debe estar entre 2020 y 2030'),

  pagina: z
    .string()
    .optional()
    .default('1')
    .refine((val) => /^\d+$/.test(val), 'La página debe ser un número entero')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1, 'La página debe ser mayor a 0'),

  limite: z
    .string()
    .optional()
    .default('10')
    .refine((val) => /^\d+$/.test(val), 'El límite debe ser un número entero')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1 && val <= 100, 'El límite debe estar entre 1 y 100')
});

// Schema para validar ID del foro
export const idForoSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'El ID del foro debe ser un número entero válido')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID del foro debe ser mayor a 0')
});

// Schema para cambiar estado del foro
export const cambiarEstadoSchema = z.object({
  estado: estadoForoEnum
});

// Schema para validar fechas en general
export const validarFechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato YYYY-MM-DD')
  .refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, 'Debe ser una fecha válida');