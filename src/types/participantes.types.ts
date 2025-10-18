// Interfaz principal del participante (basada en la tabla usuarios)
export interface Participante {
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

// Participante sin contraseña para respuestas
export interface ParticipanteSinPassword {
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

// Participante con información del rol (para JOIN)
export interface ParticipanteConRol {
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

// Request para crear participante
export interface CrearParticipanteRequest {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  colegio?: string;
  tipo: 'I' | 'E';
  password: string;
  id_rol: number;
}

// Request para actualizar participante
export interface ActualizarParticipanteRequest {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  colegio?: string;
  tipo?: 'I' | 'E';
}

// Respuesta estándar de la API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Parámetros de consulta para listar participantes
export interface FiltrosParticipantes {
  nombre?: string;
  apellido?: string;
  correo?: string;
  tipo?: 'I' | 'E';
  colegio?: string;
  pagina?: number;
  limite?: number;
}

// Respuesta paginada para lista de participantes
export interface RespuestaPaginada<T> {
  success: boolean;
  data: T[];
  pagination: {
    pagina_actual: number;
    total_paginas: number;
    total_registros: number;
    limite: number;
  };
  message?: string;
}