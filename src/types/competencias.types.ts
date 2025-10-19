// Interfaz principal de la competencia (basada en la tabla competencias)
export interface Competencia {
  id_competencia: number;
  titulo: string;
  descripcion: string;
  cupo: number;
  horario: Date;
  id_categoria?: number;
  id_staff_responsable?: number;
  creado_en: Date;
  anio_evento?: number;
  imagen_url?: string;
}

// Interfaz para el objeto categoría
export interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion?: string;
}

// Competencia con información de la categoría (para JOIN)
export interface CompetenciaConCategoria {
  id_competencia: number;
  titulo: string;
  descripcion: string;
  cupo: number;
  horario: Date;
  categoria?: Categoria;
  id_staff_responsable?: number;
  creado_en: Date;
  anio_evento?: number;
  imagen_url?: string;
}

// Request para crear competencia
export interface CrearCompetenciaRequest {
  titulo: string;
  descripcion: string;
  cupo: number;
  horario: string; // ISO string para fecha/hora
  id_categoria?: number;
  id_staff_responsable?: number;
  anio_evento?: number;
  imagen_url?: string;
}

// Request para actualizar competencia
export interface ActualizarCompetenciaRequest {
  titulo?: string;
  descripcion?: string;
  cupo?: number;
  horario?: string; // ISO string para fecha/hora
  id_categoria?: number;
  id_staff_responsable?: number;
  anio_evento?: number;
  imagen_url?: string;
}

// Respuesta estándar de la API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Parámetros de consulta para listar competencias
export interface FiltrosCompetencias {
  titulo?: string;
  id_categoria?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  cupo_minimo?: number;
  cupo_maximo?: number;
  anio_evento?: number;
  pagina: number;
  limite: number;
}

// Respuesta paginada para lista de competencias
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

// Parámetros de ruta para ID de competencia
export interface CompetenciaIdParams {
  id: number;
}