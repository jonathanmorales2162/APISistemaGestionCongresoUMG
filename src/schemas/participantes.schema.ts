import { z } from 'zod';

// Esquema para crear un participante
export const crearParticipanteSchema = z.object({
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

// Esquema para actualizar un participante
export const actualizarParticipanteSchema = z.object({
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
    .optional()
});

// Esquema para filtros de búsqueda de participantes
export const filtrosParticipantesSchema = z.object({
  nombre: z.string()
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),
  apellido: z.string()
    .max(100, 'El apellido no puede exceder 100 caracteres')
    .optional(),
  correo: z.string()
    .email('Formato de correo inválido')
    .max(150, 'El correo no puede exceder 150 caracteres')
    .optional(),
  tipo: z.string()
    .refine((val) => ['I', 'E'].includes(val), {
      message: 'El tipo debe ser I (Interno) o E (Externo)'
    })
    .optional(),
  colegio: z.string()
    .max(150, 'El colegio no puede exceder 150 caracteres')
    .optional(),
  pagina: z.string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'La página debe ser un número mayor a 0'
    })
    .default(1),
  limite: z.string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 100, {
      message: 'El límite debe ser un número entre 1 y 100'
    })
    .default(10)
});

// Esquema para validar ID de participante
export const idParticipanteSchema = z.object({
  id: z.string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'El ID del participante debe ser un número válido mayor a 0'
    })
});

// Esquema para validar que el rol sea de participante
export const validarRolParticipanteSchema = z.object({
  id_rol: z.number()
    .int('El ID del rol debe ser un número entero')
    .positive('El ID del rol debe ser mayor a 0')
    .refine(async (id_rol) => {
      // Esta validación se hará en el controlador para verificar que sea rol de participante
      return true;
    }, {
      message: 'El rol especificado no corresponde a un participante'
    })
});