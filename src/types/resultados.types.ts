// Tipo base para un resultado
export interface Resultado {
  id_resultado: number;
  id_competencia: number;
  id_usuario: number;
  posicion: number;
  descripcion?: string;
  creado_en: Date;
  nombre_proyecto?: string;
  foto_url?: string;
  anio_evento?: number;
}

// Tipo para crear un resultado (sin campos auto-generados)
export interface CreateResultado {
  id_competencia: number;
  id_usuario: number;
  posicion: number;
  descripcion?: string;
  nombre_proyecto?: string;
  foto_url?: string;
  anio_evento?: number;
}

// Tipo para actualizar un resultado (todos los campos opcionales)
export interface UpdateResultado {
  id_competencia?: number;
  id_usuario?: number;
  posicion?: number;
  descripcion?: string;
  nombre_proyecto?: string;
  foto_url?: string;
  anio_evento?: number;
}

// Tipo extendido con información de usuario y competencia
export interface ResultadoConDetalles extends Resultado {
  usuario_nombre: string;
  usuario_apellido: string;
  usuario_correo: string;
  competencia_titulo: string;
  competencia_descripcion: string;
}

// Tipo para respuesta de API
export interface ResultadoResponse {
  success: boolean;
  data?: Resultado | Resultado[];
  message?: string;
  error?: string;
}

// Tipo para respuesta extendida con detalles
export interface ResultadoDetallesResponse {
  success: boolean;
  data?: ResultadoConDetalles | ResultadoConDetalles[];
  message?: string;
  error?: string;
}

// Tipo para filtros de búsqueda
export interface ResultadoFilters {
  id_competencia?: number;
  id_usuario?: number;
  posicion?: number;
  anio_evento?: number;
  limit?: number;
  offset?: number;
}