import { z } from 'zod';

/**
 * Esquemas de validación Zod para el módulo de FAQ (Preguntas Frecuentes)
 */

// Esquema para crear una nueva FAQ
export const crearFaqSchema = z.object({
  pregunta: z
    .string()
    .min(10, 'La pregunta debe tener al menos 10 caracteres')
    .max(500, 'La pregunta no puede exceder 500 caracteres')
    .trim(),
  
  respuesta: z
    .string()
    .min(20, 'La respuesta debe tener al menos 20 caracteres')
    .max(2000, 'La respuesta no puede exceder 2000 caracteres')
    .trim(),
  
  estado: z.enum(['A', 'I']).default('A')
});

// Esquema para actualizar una FAQ existente
export const actualizarFaqSchema = z.object({
  pregunta: z
    .string()
    .min(10, 'La pregunta debe tener al menos 10 caracteres')
    .max(500, 'La pregunta no puede exceder 500 caracteres')
    .trim()
    .optional(),
  
  respuesta: z
    .string()
    .min(20, 'La respuesta debe tener al menos 20 caracteres')
    .max(2000, 'La respuesta no puede exceder 2000 caracteres')
    .trim()
    .optional(),
  
  estado: z.enum(['A', 'I']).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  'Debe proporcionar al menos un campo para actualizar'
);

// Esquema para parámetros de ruta (ID de FAQ)
export const faqParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'El ID debe ser un número válido')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'El ID debe ser mayor a 0')
});

// Esquema para filtros de búsqueda
export const filtrosFaqSchema = z.object({
  pregunta: z
    .string()
    .min(3, 'La búsqueda debe tener al menos 3 caracteres')
    .max(100, 'La búsqueda no puede exceder 100 caracteres')
    .optional(),
  
  estado: z.enum(['A', 'I']).optional(),
  
  pagina: z
    .string()
    .default('1')
    .transform((val) => parseInt(val))
    .refine((val) => !isNaN(val) && val > 0, 'Página inválida'),
  
  limite: z
    .string()
    .default('10')
    .transform((val) => parseInt(val))
    .refine((val) => !isNaN(val) && val > 0 && val <= 100, 'Límite inválido')
});

// Esquema para cambiar estado de FAQ
export const cambiarEstadoFaqSchema = z.object({
  estado: z
    .enum(['A', 'I'])
});