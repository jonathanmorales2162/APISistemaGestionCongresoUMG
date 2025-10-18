import type { Request, Response, NextFunction } from 'express';

// Definición de permisos por rol según las reglas del proyecto
export const ROLE_PERMISSIONS = {
  Admin: [
    "usuarios:create", "usuarios:read", "usuarios:update", "usuarios:delete",
    "roles:read", "roles:create", "roles:update", "roles:delete",
    "talleres:*", "competencias:*",
    "inscripciones:*",
    "asistencia:read", "asistencia:create", "asistencia:update", "asistencia:delete",
    "diplomas:generate", "diplomas:read",
    "resultados:*",
    "auditoria:read",
    "foros:*"
  ],
  Organizador: [
    "usuarios:read", "usuarios:update",
    "roles:read",
    "talleres:create", "talleres:update", "talleres:read",
    "competencias:create", "competencias:update", "competencias:read",
    "inscripciones:create", "inscripciones:read", "inscripciones:update", "inscripciones:delete",
    "asistencia:read",
    "diplomas:generate", "diplomas:read",
    "resultados:create", "resultados:update", "resultados:read",
    "foros:create", "foros:update", "foros:read", "foros:delete"
  ],
  Staff: [
    "usuarios:read",
    "talleres:read", "competencias:read",
    "asistencia:create", "asistencia:update", "asistencia:read",
    "diplomas:generate", "diplomas:read",
    "resultados:read",
    "foros:read"
  ],
  Participante: [
    "usuarios:read_self", "usuarios:update_self",
    "talleres:read", "competencias:read",
    "inscripciones:create_self", "inscripciones:delete_self", "inscripciones:read_self",
    "asistencia:read_self",
    "diplomas:read_self",
    "resultados:read",
    "foros:read"
  ]
};

/**
 * Middleware de autorización que verifica permisos basados en roles
 * Implementa las reglas 7 y 8 del proyecto
 * 
 * @param requiredPermission - Permiso requerido en formato "modulo:accion"
 * @returns Middleware function
 */
export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Verificar que el usuario esté autenticado (regla 8)
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'No autorizado',
          message: 'Debe estar autenticado para acceder a este recurso'
        });
        return;
      }

      const { rol, id: userId } = req.user;
      
      // Verificar que el rol del usuario esté definido
      if (!rol || !ROLE_PERMISSIONS[rol as keyof typeof ROLE_PERMISSIONS]) {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado',
          message: 'Rol de usuario no válido o no definido'
        });
        return;
      }

      const userPermissions = ROLE_PERMISSIONS[rol as keyof typeof ROLE_PERMISSIONS];
      
      // Verificar permisos específicos (regla 7)
      const hasPermission = checkPermission(userPermissions, requiredPermission, userId, req);
      
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado',
          message: `No tiene permisos para realizar esta acción. Se requiere: ${requiredPermission}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error en middleware de autorización:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno',
        message: 'Error interno del servidor durante la verificación de permisos'
      });
      return;
    }
  };
};

/**
 * Verifica si el usuario tiene el permiso requerido
 * 
 * @param userPermissions - Array de permisos del usuario
 * @param requiredPermission - Permiso requerido
 * @param userId - ID del usuario (para permisos _self)
 * @param req - Request object (para verificar parámetros)
 * @returns boolean
 */
function checkPermission(
  userPermissions: string[], 
  requiredPermission: string, 
  userId: number, 
  req: Request
): boolean {
  const [module, action] = requiredPermission.split(':');
  
  // Verificar permiso exacto
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }
  
  // Verificar permiso con wildcard (*)
  if (userPermissions.includes(`${module}:*`)) {
    return true;
  }
  
  // Verificar permisos _self (solo para recursos propios)
  if (action.endsWith('_self')) {
    const baseAction = action.replace('_self', '');
    const selfPermission = `${module}:${baseAction}_self`;
    
    if (userPermissions.includes(selfPermission)) {
      // Verificar que el recurso pertenece al usuario
      return verifyResourceOwnership(userId, req);
    }
  }
  
  return false;
}

/**
 * Verifica que el recurso pertenece al usuario (para permisos _self)
 * 
 * @param userId - ID del usuario
 * @param req - Request object
 * @returns boolean
 */
function verifyResourceOwnership(userId: number, req: Request): boolean {
  // Para rutas con :id, verificar que el ID coincida con el usuario
  if (req.params.id) {
    const resourceId = parseInt(req.params.id);
    return resourceId === userId;
  }
  
  // Para rutas de perfil o recursos propios
  if (req.route?.path?.includes('/perfil')) {
    return true;
  }
  
  // Para otros casos, verificar en el body si hay id_usuario
  if (req.body?.id_usuario) {
    return req.body.id_usuario === userId;
  }
  
  return true; // Por defecto permitir para permisos _self
}

/**
 * Middleware para verificar múltiples permisos (OR logic)
 * El usuario debe tener al menos uno de los permisos especificados
 * 
 * @param permissions - Array de permisos requeridos
 * @returns Middleware function
 */
export const requireAnyPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'No autorizado',
          message: 'Debe estar autenticado para acceder a este recurso'
        });
        return;
      }

      const { rol, id: userId } = req.user;
      
      if (!rol || !ROLE_PERMISSIONS[rol as keyof typeof ROLE_PERMISSIONS]) {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado',
          message: 'Rol de usuario no válido o no definido'
        });
        return;
      }

      const userPermissions = ROLE_PERMISSIONS[rol as keyof typeof ROLE_PERMISSIONS];
      
      // Verificar si el usuario tiene al menos uno de los permisos requeridos
      const hasAnyPermission = permissions.some(permission => 
        checkPermission(userPermissions, permission, userId, req)
      );
      
      if (!hasAnyPermission) {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado',
          message: `No tiene permisos para realizar esta acción. Se requiere uno de: ${permissions.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error en middleware de autorización múltiple:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno',
        message: 'Error interno del servidor durante la verificación de permisos'
      });
      return;
    }
  };
};