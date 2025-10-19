export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  colegio?: string;
  tipo: 'I' | 'E';
  password_hash: string;
  id_rol: number;
  foto_url?: string;
  creado_en: Date;
}

export interface UsuarioSinPassword {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  colegio?: string;
  tipo: 'I' | 'E';
  id_rol: number;
  foto_url?: string;
  creado_en: Date;
}

export interface Rol {
  id_rol: number;
  nombre: string;
}

export interface UsuarioConRol {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  colegio?: string;
  tipo: 'I' | 'E';
  rol: Rol;
  foto_url?: string;
  creado_en: Date;
}

export interface CrearUsuarioRequest {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  colegio?: string;
  tipo: 'I' | 'E';
  password: string;
  id_rol: number;
  foto_url?: string;
}

export interface ActualizarUsuarioRequest {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  colegio?: string;
  tipo?: 'I' | 'E';
  id_rol?: number;
  foto_url?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface FiltrosUsuarios {
  nombre?: string;
  apellido?: string;
  correo?: string;
  tipo?: 'I' | 'E';
  colegio?: string;
  pagina?: number;
  limite?: number;
}