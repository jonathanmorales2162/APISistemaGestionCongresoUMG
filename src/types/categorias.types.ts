/**
 * Tipos TypeScript para el módulo de categorías
 * Utilizadas en talleres, competencias y foros
 */

// Tipo base para una categoría (estructura existente en BD)
export interface Categoria {
  id_categoria: number;
  nombre: string;
  descripcion: string;
}

// Tipo para crear una nueva categoría
export interface CrearCategoriaRequest {
  nombre: string;
  descripcion: string;
}

// Tipo para actualizar una categoría existente
export interface ActualizarCategoriaRequest {
  nombre?: string;
  descripcion?: string;
}

// Tipo para la respuesta de listado de categorías con paginación
export interface ListarCategoriasResponse {
  categorias: Categoria[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

// Tipo para parámetros de consulta en el listado
export interface ListarCategoriasQuery {
  pagina?: string;
  limite?: string;
  buscar?: string;
}

// Tipo para parámetros de ruta
export interface CategoriaParams {
  id: string;
}

// Tipo para verificar si una categoría está en uso
export interface CategoriaEnUso {
  en_uso: boolean;
  talleres_count: number;
  competencias_count: number;
  foros_count: number;
}

// Tipo para respuesta de eliminación
export interface EliminarCategoriaResponse {
  success: boolean;
  message: string;
}

// Tipo para respuesta estándar de operaciones
export interface CategoriaResponse {
  success: boolean;
  message: string;
  categoria?: Categoria;
}