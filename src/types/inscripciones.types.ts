// Interfaz principal de la inscripción (basada en la tabla inscripciones)
export interface Inscripcion {
  id_inscripcion: number;
  id_usuario: number;
  id_tipo: number;
  id_taller?: number;
  id_competencia?: number;
  id_foro?: number;
  fecha_inscripcion: Date;
}

// Interfaz para el tipo de evento
export interface TipoEvento {
  id_tipo: number;
  nombre: string; // 'Taller', 'Competencia' o 'Foro'
}

// Interfaz para información básica del usuario
export interface UsuarioBasico {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  colegio?: string;
  tipo: 'I' | 'E'; // I = interno, E = externo
  foto_url?: string;
}

// Interfaz para información básica del taller
export interface TallerBasico {
  id_taller: number;
  titulo: string;
  descripcion: string;
  cupo: number;
  horario: Date;
  imagen_url?: string;
  anio_evento?: number;
}

// Interfaz para información básica de la competencia
export interface CompetenciaBasica {
  id_competencia: number;
  titulo: string;
  descripcion: string;
  cupo: number;
  horario: Date;
  imagen_url?: string;
  anio_evento?: number;
}

// Interfaz para información básica del foro
export interface ForoBasico {
  id_foro: number;
  titulo: string;
  descripcion: string;
  fecha_creacion: Date;
  estado: 'A' | 'I'; // A = Activo, I = Inactivo
  imagen_url?: string;
}

// Inscripción con información completa (para JOIN)
export interface InscripcionCompleta {
  id_inscripcion: number;
  id_usuario: number;
  id_tipo: number;
  id_taller?: number;
  id_competencia?: number;
  id_foro?: number;
  fecha_inscripcion: Date;
  usuario: UsuarioBasico;
  tipo_evento: TipoEvento;
  taller?: TallerBasico;
  competencia?: CompetenciaBasica;
  foro?: ForoBasico;
}

// Request para crear inscripción
export interface CrearInscripcionRequest {
  id_taller?: number;
  id_competencia?: number;
  id_foro?: number;
}

// Parámetros de ruta para inscripciones
export interface InscripcionParams {
  id: string;
}

// Query parameters para listar inscripciones
export interface ListarInscripcionesQuery {
  id_usuario?: string;
  id_tipo?: string;
  id_taller?: string;
  id_competencia?: string;
  id_foro?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  pagina?: string;
  limite?: string;
}

// Respuesta para listar inscripciones
export interface ListarInscripcionesResponse {
  inscripciones: InscripcionCompleta[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

// Respuesta estándar de la API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Respuesta para crear inscripción
export interface CrearInscripcionResponse {
  success: boolean;
  message: string;
  inscripcion?: InscripcionCompleta;
}

// Respuesta para eliminar inscripción
export interface EliminarInscripcionResponse {
  success: boolean;
  message: string;
}

// Respuesta para obtener inscripción por ID
export interface InscripcionResponse {
  success: boolean;
  message?: string;
  inscripcion?: InscripcionCompleta;
}

// Filtros para validación de inscripciones
export interface FiltrosInscripciones {
  id_usuario?: number;
  id_tipo?: number;
  id_taller?: number;
  id_competencia?: number;
  id_foro?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  pagina: number;
  limite: number;
}

// Información de cupos disponibles
export interface CupoInfo {
  cupo_total: number;
  inscripciones_actuales: number;
  cupo_disponible: number;
}

// Validación de inscripción
export interface ValidacionInscripcion {
  puede_inscribirse: boolean;
  razon?: string;
  cupo_info?: CupoInfo;
}