import { z } from 'zod';

// Esquema para crear un usuario
export const crearUsuarioSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  apellido: z.string()
    .min(1, 'El apellido es requerido')
    .max(100, 'El apellido no puede exceder 100 caracteres')
    .trim(),
  correo: z.string()
    .email('Formato de correo inválido')
    .max(150, 'El correo no puede exceder 150 caracteres')
    .toLowerCase(),
  telefono: z.string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .optional(),
  colegio: z.string()
    .max(150, 'El colegio no puede exceder 150 caracteres')
    .optional(),
tipo: z.string()
  .refine((val) => ['I', 'E'].includes(val), {
    message: 'El tipo debe ser I (Interno) o E (Externo)'
  }),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(255, 'La contraseña no puede exceder 255 caracteres'),
  id_rol: z.number()
    .int('El ID del rol debe ser un número entero')
    .positive('El ID del rol debe ser mayor a 0')
});

// Esquema para actualizar un usuario
export const actualizarUsuarioSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
  apellido: z.string()
    .min(1, 'El apellido es requerido')
    .max(100, 'El apellido no puede exceder 100 caracteres')
    .trim()
    .optional(),
  telefono: z.string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .optional(),
  colegio: z.string()
    .max(150, 'El colegio no puede exceder 150 caracteres')
    .optional(),
  tipo: z.string()
    .refine((val) => ['I', 'E'].includes(val), {
      message: 'El tipo debe ser I (Interno) o E (Externo)'
    })
    .optional(),
  id_rol: z.number()
    .int('El ID del rol debe ser un número entero')
    .positive('El ID del rol debe ser mayor a 0')
    .optional()
});

// Esquema para filtros de usuarios
export const filtrosUsuariosSchema = z.object({
  nombre: z.string().optional(),
  apellido: z.string().optional(),
  correo: z.string().email('Formato de correo inválido').optional(),
  tipo: z.enum(['I', 'E']).optional(),
  colegio: z.string().optional(),
  id_rol: z.string().regex(/^\d+$/, 'El ID del rol debe ser un número válido').transform(Number).optional(),
  pagina: z.string().regex(/^\d+$/, 'La página debe ser un número válido').transform(Number).optional(),
  limite: z.string().regex(/^\d+$/, 'El límite debe ser un número válido').transform(Number)
    .refine((val) => val <= 100, { message: 'El límite no puede ser mayor a 100' }).optional()
});

// Esquema para el ID del usuario en parámetros
export const idUsuarioSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El ID debe ser un número válido').transform(Number)
});

// Esquema para login de usuario
export const loginUsuarioSchema = z.object({
  correo: z.string()
    .email('Formato de correo inválido')
    .max(150, 'El correo no puede exceder 150 caracteres')
    .toLowerCase(),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(255, 'La contraseña no puede exceder 255 caracteres')
});

// Tipos inferidos
export type CrearUsuarioRequest = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioRequest = z.infer<typeof actualizarUsuarioSchema>;
export type FiltrosUsuarios = z.infer<typeof filtrosUsuariosSchema>;
export type IdUsuarioParams = z.infer<typeof idUsuarioSchema>;
export type LoginUsuarioRequest = z.infer<typeof loginUsuarioSchema>;