// Interfaz principal del taller (basada en la tabla talleres)
export interface Taller {
  id_taller: number;
  titulo: string;
  descripcion: string;
  cupo: number;
  horario: Date;
  id_categoria?: number;
  id_staff_ponente?: number;
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

// Taller con información de la categoría (para JOIN)
export interface TallerConCategoria {
  id_taller: number;
  titulo: string;
  descripcion: string;
  cupo: number;
  horario: Date;
  categoria?: Categoria;
  id_staff_ponente?: number;
  creado_en: Date;
  anio_evento?: number;
  imagen_url?: string;
}

// Request para crear taller
export interface CrearTallerRequest {
  titulo: string;
  descripcion: string;
  cupo: number;
  horario: string; // ISO string para fecha/hora
  id_categoria?: number;
  id_staff_ponente?: number;
  anio_evento?: number;
  imagen_url?: string;
}

// Request para actualizar taller
export interface ActualizarTallerRequest {
  titulo?: string;
  descripcion?: string;
  cupo?: number;
  horario?: string; // ISO string para fecha/hora
  id_categoria?: number;
  id_staff_ponente?: number;
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

// Parámetros de consulta para listar talleres
export interface FiltrosTalleres {
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

// Respuesta paginada para lista de talleres
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

// Parámetros de ruta para ID de taller
export interface TallerIdParams {
  id: number;
}