export interface Asistencia {
  id_asistencia: number;
  id_usuario: number;
  id_tipo: number;
  id_taller?: number | null;
  id_competencia?: number | null;
  id_foro?: number | null;
  fecha: Date;
  estado: 'P' | 'A' | 'D'; // P=Presente, A=Ausente, D=Default
}

export interface AsistenciaCompleta extends Asistencia {
  usuario: {
    id_usuario: number;
    nombre: string;
    apellido: string;
    correo: string;
  };
  tipo_evento: {
    id_tipo: number;
    nombre: string;
  };
  taller?: {
    id_taller: number;
    titulo: string;
    descripcion: string;
    horario: string;
  } | null;
  competencia?: {
    id_competencia: number;
    titulo: string;
    descripcion: string;
    horario: string;
  } | null;
  foro?: {
    id_foro: number;
    titulo: string;
    descripcion: string;
    fecha_creacion: string;
  } | null;
}

export interface CrearAsistenciaRequest {
  id_usuario: number;
  id_taller?: number;
  id_competencia?: number;
  id_foro?: number;
  estado?: 'P' | 'A' | 'D'; // P=Presente, A=Ausente, D=Default
}

export interface ActualizarAsistenciaRequest {
  estado?: 'P' | 'A' | 'D'; // P=Presente, A=Ausente, D=Default
  fecha?: Date;
}

export interface FiltrosAsistencia {
  id_usuario?: number;
  id_tipo?: number;
  id_taller?: number;
  id_competencia?: number;
  id_foro?: number;
  estado?: 'P' | 'A' | 'D'; // P=Presente, A=Ausente, D=Default
  fecha_desde?: Date;
  fecha_hasta?: Date;
  usuario?: 'me'; // Para filtrar por usuario actual (participantes)
  pagina?: number;
  limite?: number;
}

export interface RespuestaAsistencia {
  success: boolean;
  message?: string;
  asistencia?: AsistenciaCompleta;
}

export interface RespuestaListaAsistencia {
  asistencias: AsistenciaCompleta[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}