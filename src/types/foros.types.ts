/**
 * Tipos e interfaces para el módulo de Foros
 */

// Estado del foro
export type EstadoForo = 'A' | 'I';

// Interfaz para categoría
export interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion?: string;
}

// Interfaz base del foro
export interface Foro {
  id_foro: number;
  titulo: string;
  descripcion: string;
  fecha_creacion: string; // ISO date string
  fecha_actualizacion: string; // ISO date string
  id_categoria: number;
  categoria?: Categoria;
  estado: EstadoForo;
  id_usuario: number;
}

// Interfaz para crear un nuevo foro
export interface CrearForoRequest {
  titulo: string;
  descripcion: string;
  id_categoria: number;
  estado?: EstadoForo;
}

// Interfaz para actualizar un foro
export interface ActualizarForoRequest {
  titulo?: string;
  descripcion?: string;
  id_categoria?: number;
  estado?: EstadoForo;
}

// Interfaz para filtros de foros
export interface FiltrosForos {
  estado?: EstadoForo;
  categoria?: string;
  fecha_creacion?: string; // Fecha de creación (filtro)
  pagina?: number;
  limite?: number;
}

// Interfaz genérica para respuestas de la API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Interfaz para respuestas paginadas
export interface RespuestaPaginada<T> {
  success: boolean;
  data: T[];
  pagination: {
    pagina_actual: number;
    total_paginas: number;
    total_registros: number;
    limite: number;
  };
}

// Interfaz para cambio de estado
export interface CambiarEstadoRequest {
  estado: EstadoForo;
}

// Interfaz para parámetros de ID
export interface ForoIdParams {
  id: string;
}