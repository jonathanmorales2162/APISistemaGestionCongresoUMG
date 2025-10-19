import { z } from 'zod';

/**
 * Esquemas de validación Zod para el módulo de categorías
 */

// Esquema para crear una nueva categoría
export const crearCategoriaSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .refine(val => val.length > 0, 'El nombre es requerido'),
  descripcion: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .trim()
    .refine(val => val.length > 0, 'La descripción es requerida')
});

// Esquema para actualizar una categoría existente
export const actualizarCategoriaSchema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
  descripcion: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .trim()
    .optional()
}).refine(
  data => data.nombre !== undefined || data.descripcion !== undefined,
  'Debe proporcionar al menos un campo para actualizar'
);

// Esquema para parámetros de ruta (ID de categoría)
export const categoriaParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'El ID debe ser un número válido')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'El ID debe ser mayor a 0')
});

// Esquema para parámetros de consulta en el listado
export const listarCategoriasQuerySchema = z.object({
  pagina: z
    .string()
    .regex(/^\d+$/, 'La página debe ser un número válido')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'La página debe ser mayor a 0')
    .default(1),
  limite: z
    .string()
    .regex(/^\d+$/, 'El límite debe ser un número válido')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val <= 100, 'El límite debe estar entre 1 y 100')
    .default(10),
  buscar: z
    .string()
    .min(1, 'El término de búsqueda debe tener al menos 1 carácter')
    .max(100, 'El término de búsqueda no puede exceder 100 caracteres')
    .trim()
    .optional()
});

// Tipos inferidos de los esquemas
export type CrearCategoriaData = z.infer<typeof crearCategoriaSchema>;
export type ActualizarCategoriaData = z.infer<typeof actualizarCategoriaSchema>;
export type CategoriaParamsData = z.infer<typeof categoriaParamsSchema>;
export type ListarCategoriasQueryData = z.infer<typeof listarCategoriasQuerySchema>;