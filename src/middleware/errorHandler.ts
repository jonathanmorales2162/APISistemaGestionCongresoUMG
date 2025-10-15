import type { Request, Response, NextFunction } from 'express';

// Interfaz para errores de PostgreSQL
interface PostgreSQLError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  column?: string;
}

// Middleware específico para errores de base de datos
export const databaseErrorHandler = (
  err: PostgreSQLError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Solo manejar errores de PostgreSQL
  if (!err.code) {
    return next(err);
  }

  console.error('Error de base de datos:', {
    code: err.code,
    message: err.message,
    detail: err.detail,
    constraint: err.constraint,
    table: err.table,
    column: err.column
  });

  switch (err.code) {
    // Violación de restricción única
    case '23505':
      return res.status(400).json({
        success: false,
        message: 'El registro ya existe',
        error: 'DUPLICATE_ENTRY'
      });

    // Violación de clave foránea
    case '23503':
      return res.status(400).json({
        success: false,
        message: 'Referencia inválida',
        error: 'FOREIGN_KEY_VIOLATION'
      });

    // Violación de restricción NOT NULL
    case '23502':
      return res.status(400).json({
        success: false,
        message: 'Campo requerido faltante',
        error: 'NOT_NULL_VIOLATION'
      });

    // Error de conexión
    case 'ECONNRESET':
    case 'ECONNREFUSED':
    case 'ETIMEDOUT':
      return res.status(503).json({
        success: false,
        message: 'Error de conexión con la base de datos',
        error: 'DATABASE_CONNECTION_ERROR'
      });

    // Otros errores de PostgreSQL
    default:
      return res.status(500).json({
        success: false,
        message: 'Error de base de datos',
        error: 'DATABASE_ERROR'
      });
  }
};

// Middleware general para errores no manejados
export const generalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error no manejado:', err);

  // Verificar si es un error de conexión terminada inesperadamente
  if (err.message.includes('Connection terminated unexpectedly')) {
    return res.status(503).json({
      success: false,
      message: 'Conexión con la base de datos perdida temporalmente',
      error: 'CONNECTION_LOST'
    });
  }

  // Error genérico
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: 'INTERNAL_SERVER_ERROR'
  });
};

// Función helper para envolver operaciones de base de datos
export const withDatabaseErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Error en operación de base de datos'
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error(errorMessage, error);
    throw error; // Re-lanzar para que sea manejado por el middleware
  }
};