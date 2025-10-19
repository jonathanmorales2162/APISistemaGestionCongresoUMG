/**
 * Tipos TypeScript para el módulo de FAQ (Preguntas Frecuentes)
 */

// Tipo base para una FAQ (estructura existente en BD)
export interface Faq {
  id_faq: number;
  pregunta: string;
  respuesta: string;
  estado: 'A' | 'I';
  fecha_creacion: Date;
}

// Tipo para crear una nueva FAQ
export interface CrearFaqRequest {
  pregunta: string;
  respuesta: string;
  estado?: 'A' | 'I';
}

// Tipo para actualizar una FAQ existente
export interface ActualizarFaqRequest {
  pregunta?: string;
  respuesta?: string;
  estado?: 'A' | 'I';
}

// Tipo para cambiar estado de FAQ
export interface CambiarEstadoFaqRequest {
  estado: 'A' | 'I';
}

// Tipo para la respuesta de listado de FAQs con paginación
export interface ListarFaqsResponse {
  faqs: Faq[];
  paginacion: {
    pagina_actual: number;
    total_paginas: number;
    total_registros: number;
    limite: number;
  };
}

export interface ListarFaqsQuery {
  pagina?: number;
  limite?: number;
  pregunta?: string;
  estado?: 'A' | 'I';
}

// Tipo para parámetros de ruta
export interface FaqParams {
  id: string;
}

// Tipo para estadísticas de FAQ
export interface EstadisticasFaq {
  total_faqs: number;
  faqs_activas: number;
  faqs_inactivas: number;
}

// Tipo para respuestas de la API
export interface FaqResponse {
  success: boolean;
  message: string;
  data?: Faq;
}

export interface FaqListResponse {
  success: boolean;
  message: string;
  data?: ListarFaqsResponse;
}

export interface EstadisticasFaqResponse {
  success: boolean;
  message: string;
  data?: EstadisticasFaq;
}