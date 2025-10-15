// Interfaz principal del usuario
export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  colegio?: string;
  tipo: 'I' | 'E'; // I = Interno, E = Externo
  password_hash: string;
  id_rol: number;
  creado_en: Date;
}

// Usuario sin contraseña para respuestas
export interface UsuarioSinPassword {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  colegio?: string;
  tipo: 'I' | 'E';
  id_rol: number;
  creado_en: Date;
}

// Interfaz para el objeto rol
export interface Rol {
  id_rol: number;
  nombre: string;
}

// Usuario con información del rol (para JOIN)
export interface UsuarioConRol {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  colegio?: string;
  tipo: 'I' | 'E';
  rol: Rol;
  creado_en: Date;
}

// Request para crear usuario
export interface CrearUsuarioRequest {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  colegio?: string;
  tipo: 'I' | 'E';
  password: string;
  id_rol: number;
}

// Request para actualizar usuario
export interface ActualizarUsuarioRequest {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  colegio?: string;
  tipo?: 'I' | 'E';
  id_rol?: number;
}

// Respuesta estándar de la API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Parámetros de consulta para listar usuarios
export interface FiltrosUsuarios {
  nombre?: string;
  apellido?: string;
  correo?: string;
  tipo?: 'I' | 'E';
  colegio?: string;
  pagina?: number;
  limite?: number;
}