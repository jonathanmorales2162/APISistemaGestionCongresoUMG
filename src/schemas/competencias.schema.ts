import { z } from 'zod';

// Esquema para crear una competencia
export const crearCompetenciaSchema = z.object({
  titulo: z.string()
    .min(1, 'El título es requerido')
    .max(150, 'El título no puede exceder 150 caracteres')
    .trim(),
  descripcion: z.string()
    .min(1, 'La descripción es requerida')
    .trim(),
  cupo: z.number()
    .int('El cupo debe ser un número entero')
    .positive('El cupo debe ser mayor a 0')
    .max(1000, 'El cupo no puede exceder 1000 participantes'),
  horario: z.string()
    .datetime('El horario debe ser una fecha y hora válida en formato ISO')
    .refine((date) => new Date(date) > new Date(), {
      message: 'El horario debe ser una fecha futura'
    }),
  id_categoria: z.number()
    .int('El ID de categoría debe ser un número entero')
    .positive('El ID de categoría debe ser mayor a 0')
    .optional()
});

// Esquema para actualizar una competencia
export const actualizarCompetenciaSchema = z.object({
  titulo: z.string()
    .min(1, 'El título es requerido')
    .max(150, 'El título no puede exceder 150 caracteres')
    .trim()
    .optional(),
  descripcion: z.string()
    .min(1, 'La descripción es requerida')
    .trim()
    .optional(),
  cupo: z.number()
    .int('El cupo debe ser un número entero')
    .positive('El cupo debe ser mayor a 0')
    .max(1000, 'El cupo no puede exceder 1000 participantes')
    .optional(),
  horario: z.string()
    .datetime('El horario debe ser una fecha y hora válida en formato ISO')
    .refine((date) => new Date(date) > new Date(), {
      message: 'El horario debe ser una fecha futura'
    })
    .optional(),
  id_categoria: z.number()
    .int('El ID de categoría debe ser un número entero')
    .positive('El ID de categoría debe ser mayor a 0')
    .optional()
});

// Esquema para filtros de competencias
export const filtrosCompetenciasSchema = z.object({
  titulo: z.string()
    .max(150, 'El título no puede exceder 150 caracteres')
    .optional(),
  id_categoria: z.coerce.number()
    .int('El ID de categoría debe ser un número entero')
    .positive('El ID de categoría debe ser mayor a 0')
    .optional(),
  fecha_desde: z.string()
    .datetime('La fecha desde debe ser una fecha válida en formato ISO')
    .optional(),
  fecha_hasta: z.string()
    .datetime('La fecha hasta debe ser una fecha válida en formato ISO')
    .optional(),
  cupo_minimo: z.coerce.number()
    .int('El cupo mínimo debe ser un número entero')
    .min(1, 'El cupo mínimo debe ser mayor a 0')
    .optional(),
  cupo_maximo: z.coerce.number()
    .int('El cupo máximo debe ser un número entero')
    .min(1, 'El cupo máximo debe ser mayor a 0')
    .optional(),
  pagina: z.coerce.number()
    .int('La página debe ser un número entero')
    .min(1, 'La página debe ser mayor a 0')
    .default(1),
  limite: z.coerce.number()
    .int('El límite debe ser un número entero')
    .min(1, 'El límite debe ser mayor a 0')
    .max(100, 'El límite no puede exceder 100')
    .default(10)
}).refine((data) => {
  if (data.fecha_desde && data.fecha_hasta) {
    return new Date(data.fecha_desde) <= new Date(data.fecha_hasta);
  }
  return true;
}, {
  message: 'La fecha desde debe ser anterior o igual a la fecha hasta',
  path: ['fecha_desde']
}).refine((data) => {
  if (data.cupo_minimo && data.cupo_maximo) {
    return data.cupo_minimo <= data.cupo_maximo;
  }
  return true;
}, {
  message: 'El cupo mínimo debe ser menor o igual al cupo máximo',
  path: ['cupo_minimo']
});

// Esquema para validar ID de competencia
export const idCompetenciaSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, 'El ID debe ser un número válido')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID debe ser mayor a 0')
});