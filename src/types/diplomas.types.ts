export interface Diploma {
  id_diploma: string;
  id_usuario: string;
  id_tipo: number;
  id_taller?: string | null;
  id_competencia?: string | null;
  fecha_generacion: Date;
  archivo_pdf?: string | null;
  enviado_correo?: boolean;
  fecha_envio?: Date | null;
}

export interface CrearDiplomaRequest {
  id_usuario: string;
  id_taller?: string;
  id_competencia?: string;
  enviado_correo?: boolean;
  fecha_envio?: string;
}

export interface ActualizarDiplomaRequest {
  enviado_correo?: boolean;
  fecha_envio?: string;
}

export interface DiplomaConDetalles extends Diploma {
  usuario_nombre?: string;
  usuario_apellido?: string;
  usuario_correo?: string;
  taller_titulo?: string;
  competencia_titulo?: string;
  tipo_evento?: string;
}

export interface FiltrosDiplomas {
  id_usuario?: string;
  id_taller?: string;
  id_competencia?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  enviado_correo?: boolean;
  limite?: number;
  pagina?: number;
}

export interface RespuestaDiplomas {
  diplomas: DiplomaConDetalles[];
  total: number;
  pagina: number;
  limite: number;
  total_paginas: number;
}