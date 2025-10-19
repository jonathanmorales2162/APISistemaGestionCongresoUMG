import { z } from 'zod';

export const crearAsistenciaSchema = z.object({
  id_usuario: z.number().int().positive('El ID del usuario debe ser un número positivo'),
  id_taller: z.number().int().positive('El ID del taller debe ser un número positivo').optional(),
  id_competencia: z.number().int().positive('El ID de la competencia debe ser un número positivo').optional(),
  id_foro: z.number().int().positive('El ID del foro debe ser un número positivo').optional(),
  estado: z.enum(['P', 'A', 'D']).default('D'),
  token_qr: z.string().max(255, 'El token QR no puede exceder 255 caracteres').optional()
}).refine(
  (data) => {
    const hasEvent = [data.id_taller, data.id_competencia, data.id_foro].filter(Boolean).length;
    return hasEvent === 1;
  },
  {
    message: 'Debe especificar exactamente uno: id_taller, id_competencia o id_foro',
    path: ['id_taller']
  }
);

export const actualizarAsistenciaSchema = z.object({
  estado: z.enum(['P', 'A', 'D']).optional(),
  fecha: z.string().datetime('La fecha debe estar en formato ISO 8601').optional(),
  token_qr: z.string().max(255, 'El token QR no puede exceder 255 caracteres').optional()
});

export const filtrosAsistenciaSchema = z.object({
  id_usuario: z.string().transform(val => parseInt(val)).pipe(
    z.number().int().positive('El ID del usuario debe ser un número positivo')
  ).optional(),
  id_tipo: z.string().transform(val => parseInt(val)).pipe(
    z.number().int().positive('El ID del tipo debe ser un número positivo')
  ).optional(),
  id_taller: z.string().transform(val => parseInt(val)).pipe(
    z.number().int().positive('El ID del taller debe ser un número positivo')
  ).optional(),
  id_competencia: z.string().transform(val => parseInt(val)).pipe(
    z.number().int().positive('El ID de la competencia debe ser un número positivo')
  ).optional(),
  id_foro: z.string().transform(val => parseInt(val)).pipe(
    z.number().int().positive('El ID del foro debe ser un número positivo')
  ).optional(),
  estado: z.enum(['P', 'A', 'D']).optional(),
  fecha_desde: z.string().datetime('La fecha desde debe estar en formato ISO 8601').optional(),
  fecha_hasta: z.string().datetime('La fecha hasta debe estar en formato ISO 8601').optional(),
  usuario: z.enum(['me']).optional(),
  pagina: z.string().transform(val => parseInt(val)).pipe(
    z.number().int().min(1, 'La página debe ser mayor a 0')
  ).default(1),
  limite: z.string().transform(val => parseInt(val)).pipe(
    z.number().int().min(1, 'El límite debe ser mayor a 0').max(100, 'El límite no puede ser mayor a 100')
  ).default(10)
});

export const idAsistenciaSchema = z.object({
  id: z.string().transform(val => parseInt(val)).pipe(
    z.number().int().positive('El ID de la asistencia debe ser un número positivo')
  )
});