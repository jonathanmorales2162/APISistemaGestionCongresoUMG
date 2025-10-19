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
  usuario_foto_url?: string;
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

// Tipo para estadísticas de resultados
export interface EstadisticasResultados {
  total_resultados: number;
  total_competencias_con_resultados: number;
  total_participantes_con_resultados: number;
  distribucion_posiciones: {
    primer_lugar: number;
    segundo_lugar: number;
    tercer_lugar: number;
    otras_posiciones: number;
  };
  resultados_por_competencia: {
    id_competencia: number;
    titulo_competencia: string;
    total_resultados: number;
  }[];
  top_participantes: {
    id_usuario: number;
    nombre_completo: string;
    total_participaciones: number;
    mejores_posiciones: number;
  }[];
}

// Tipo para respuesta de estadísticas
export interface EstadisticasResultadosResponse {
  success: boolean;
  data?: EstadisticasResultados;
  message?: string;
  error?: string;
}