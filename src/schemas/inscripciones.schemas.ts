import { z } from 'zod';

// Schema para crear inscripción
export const crearInscripcionSchema = z.object({
  id_taller: z.number().int().positive().optional(),
  id_competencia: z.number().int().positive().optional(),
  id_foro: z.number().int().positive().optional()
}).refine(
  (data) => {
    // Debe tener exactamente uno de los tres: id_taller, id_competencia o id_foro
    const hasIdTaller = data.id_taller !== undefined;
    const hasIdCompetencia = data.id_competencia !== undefined;
    const hasIdForo = data.id_foro !== undefined;
    const count = [hasIdTaller, hasIdCompetencia, hasIdForo].filter(Boolean).length;
    return count === 1; // Exactamente uno debe estar presente
  },
  {
    message: "Debe especificar exactamente uno: id_taller, id_competencia o id_foro",
    path: ["id_taller", "id_competencia", "id_foro"]
  }
);

// Schema para parámetros de ruta
export const inscripcionParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID debe ser un número válido").transform(Number)
});

// Schema para query parameters de listado
export const listarInscripcionesQuerySchema = z.object({
  id_usuario: z.string().regex(/^\d+$/, "id_usuario debe ser un número válido").transform(Number).optional(),
  id_tipo: z.string().regex(/^\d+$/, "id_tipo debe ser un número válido").transform(Number).optional(),
  id_taller: z.string().regex(/^\d+$/, "id_taller debe ser un número válido").transform(Number).optional(),
  id_competencia: z.string().regex(/^\d+$/, "id_competencia debe ser un número válido").transform(Number).optional(),
  id_foro: z.string().regex(/^\d+$/, "id_foro debe ser un número válido").transform(Number).optional(),
  fecha_desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_desde debe tener formato YYYY-MM-DD").optional(),
  fecha_hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha_hasta debe tener formato YYYY-MM-DD").optional(),
  pagina: z.string().regex(/^\d+$/, "pagina debe ser un número válido").transform(Number).default(1),
  limite: z.string().regex(/^\d+$/, "limite debe ser un número válido").transform(Number).default(10)
}).refine(
  (data) => {
    // Si se especifican fechas, fecha_desde debe ser menor o igual a fecha_hasta
    if (data.fecha_desde && data.fecha_hasta) {
      return new Date(data.fecha_desde) <= new Date(data.fecha_hasta);
    }
    return true;
  },
  {
    message: "fecha_desde debe ser menor o igual a fecha_hasta",
    path: ["fecha_desde", "fecha_hasta"]
  }
).refine(
  (data) => {
    // Validar que limite esté en un rango razonable
    return data.limite >= 1 && data.limite <= 100;
  },
  {
    message: "limite debe estar entre 1 y 100",
    path: ["limite"]
  }
).refine(
  (data) => {
    // Validar que pagina sea positiva
    return data.pagina >= 1;
  },
  {
    message: "pagina debe ser mayor a 0",
    path: ["pagina"]
  }
);

// Schema para validar datos de inscripción en base de datos
export const inscripcionDbSchema = z.object({
  id_inscripcion: z.number().int().positive(),
  id_usuario: z.number().int().positive(),
  id_tipo: z.number().int().positive(),
  id_taller: z.number().int().positive().nullable(),
  id_competencia: z.number().int().positive().nullable(),
  fecha_inscripcion: z.date()
});

// Schema para validar usuario básico
export const usuarioBasicoSchema = z.object({
  id_usuario: z.number().int().positive(),
  nombre: z.string().min(1, "Nombre es requerido"),
  apellido: z.string().min(1, "Apellido es requerido"),
  correo: z.string().email("Correo debe ser válido"),
  telefono: z.string().optional(),
  colegio: z.string().optional(),
  tipo: z.enum(['I', 'E'], { message: "Tipo debe ser 'I' (interno) o 'E' (externo)" })
});

// Schema para validar tipo de evento
export const tipoEventoSchema = z.object({
  id_tipo: z.number().int().positive(),
  nombre: z.string().min(1, "Nombre del tipo es requerido")
});

// Schema para validar taller básico
export const tallerBasicoSchema = z.object({
  id_taller: z.number().int().positive(),
  titulo: z.string().min(1, "Título es requerido"),
  descripcion: z.string().min(1, "Descripción es requerida"),
  cupo: z.number().int().positive("Cupo debe ser positivo"),
  horario: z.date()
});

// Schema para validar competencia básica
export const competenciaBasicaSchema = z.object({
  id_competencia: z.number().int().positive(),
  titulo: z.string().min(1, "Título es requerido"),
  descripcion: z.string().min(1, "Descripción es requerida"),
  cupo: z.number().int().positive("Cupo debe ser positivo"),
  horario: z.date()
});

// Schema para validar inscripción completa
export const inscripcionCompletaSchema = z.object({
  id_inscripcion: z.number().int().positive(),
  id_usuario: z.number().int().positive(),
  id_tipo: z.number().int().positive(),
  id_taller: z.number().int().positive().nullable(),
  id_competencia: z.number().int().positive().nullable(),
  fecha_inscripcion: z.date(),
  usuario: usuarioBasicoSchema,
  tipo_evento: tipoEventoSchema,
  taller: tallerBasicoSchema.optional(),
  competencia: competenciaBasicaSchema.optional()
});

// Schema para validar filtros de inscripciones
export const filtrosInscripcionesSchema = z.object({
  id_usuario: z.number().int().positive().optional(),
  id_tipo: z.number().int().positive().optional(),
  id_taller: z.number().int().positive().optional(),
  id_competencia: z.number().int().positive().optional(),
  fecha_desde: z.string().optional(),
  fecha_hasta: z.string().optional(),
  pagina: z.number().int().positive().default(1),
  limite: z.number().int().min(1).max(100).default(10)
});

// Schema para validar información de cupos
export const cupoInfoSchema = z.object({
  cupo_total: z.number().int().min(0),
  inscripciones_actuales: z.number().int().min(0),
  cupo_disponible: z.number().int().min(0)
});

// Schema para validar validación de inscripción
export const validacionInscripcionSchema = z.object({
  puede_inscribirse: z.boolean(),
  razon: z.string().optional(),
  cupo_info: cupoInfoSchema.optional()
});

// Tipos inferidos de los schemas
export type CrearInscripcionInput = z.infer<typeof crearInscripcionSchema>;
export type InscripcionParams = z.infer<typeof inscripcionParamsSchema>;
export type ListarInscripcionesQuery = z.infer<typeof listarInscripcionesQuerySchema>;
export type InscripcionDb = z.infer<typeof inscripcionDbSchema>;
export type UsuarioBasico = z.infer<typeof usuarioBasicoSchema>;
export type TipoEvento = z.infer<typeof tipoEventoSchema>;
export type TallerBasico = z.infer<typeof tallerBasicoSchema>;
export type CompetenciaBasica = z.infer<typeof competenciaBasicaSchema>;
export type InscripcionCompleta = z.infer<typeof inscripcionCompletaSchema>;
export type FiltrosInscripciones = z.infer<typeof filtrosInscripcionesSchema>;
export type CupoInfo = z.infer<typeof cupoInfoSchema>;
export type ValidacionInscripcion = z.infer<typeof validacionInscripcionSchema>;