import { z } from 'zod';

export const crearDiplomaSchema = z.object({
  id_usuario: z.string().min(1, 'ID de usuario es requerido'),
  id_taller: z.string().optional(),
  id_competencia: z.string().optional()
}).refine(
  (data) => data.id_taller || data.id_competencia,
  {
    message: 'Debe especificar id_taller o id_competencia',
    path: ['id_taller']
  }
).refine(
  (data) => !(data.id_taller && data.id_competencia),
  {
    message: 'No puede especificar tanto id_taller como id_competencia',
    path: ['id_taller']
  }
);

export const filtrosDiplomasSchema = z.object({
  id_usuario: z.string().optional(),
  id_taller: z.string().optional(),
  id_competencia: z.string().optional(),
  fecha_desde: z.string().datetime().optional(),
  fecha_hasta: z.string().datetime().optional(),
  limite: z.string().transform((val) => parseInt(val, 10)).pipe(
    z.number().min(1).max(100)
  ).optional(),
  pagina: z.string().transform((val) => parseInt(val, 10)).pipe(
    z.number().min(1)
  ).optional()
});

export const diplomaIdSchema = z.object({
  id: z.string().min(1, 'ID del diploma es requerido')
});

export type CrearDiplomaInput = z.infer<typeof crearDiplomaSchema>;
export type FiltrosDiplomasInput = z.infer<typeof filtrosDiplomasSchema>;
export type DiplomaIdInput = z.infer<typeof diplomaIdSchema>;