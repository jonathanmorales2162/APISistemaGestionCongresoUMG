import { z } from 'zod';

// Schema para crear un resultado
export const createResultadoSchema = z.object({
  id_competencia: z.number().int().positive({
    message: 'El ID de la competencia debe ser un número entero positivo'
  }),
  id_usuario: z.number().int().positive({
    message: 'El ID del usuario debe ser un número entero positivo'
  }),
  posicion: z.number().int().positive({
    message: 'La posición debe ser un número entero positivo'
  }),
  descripcion: z.string().optional()
});

// Schema para actualizar un resultado
export const updateResultadoSchema = z.object({
  id_competencia: z.number().int().positive({
    message: 'El ID de la competencia debe ser un número entero positivo'
  }).optional(),
  id_usuario: z.number().int().positive({
    message: 'El ID del usuario debe ser un número entero positivo'
  }).optional(),
  posicion: z.number().int().positive({
    message: 'La posición debe ser un número entero positivo'
  }).optional(),
  descripcion: z.string().optional()
});

// Schema para parámetros de ID
export const resultadoIdSchema = z.object({
  id: z.string().regex(/^\d+$/, {
    message: 'El ID debe ser un número válido'
  }).transform(Number)
});

// Schema para query parameters de filtrado
export const resultadosQuerySchema = z.object({
  id_competencia: z.string().regex(/^\d+$/).transform(Number).optional(),
  id_usuario: z.string().regex(/^\d+$/).transform(Number).optional(),
  posicion: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional()
});

export type CreateResultadoInput = z.infer<typeof createResultadoSchema>;
export type UpdateResultadoInput = z.infer<typeof updateResultadoSchema>;
export type ResultadoIdInput = z.infer<typeof resultadoIdSchema>;
export type ResultadosQueryInput = z.infer<typeof resultadosQuerySchema>;