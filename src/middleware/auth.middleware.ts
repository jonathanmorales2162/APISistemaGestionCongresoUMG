import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import { ROLE_PERMISSIONS } from './authorization.middleware.js';

// Extend the Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        rol: string;
        id_rol: number;
        permisos: string[];
      };
    }
  }
}

// CORREGIDO: Middleware mejorado para Express v5.1.0 y Vercel serverless
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ 
        success: false,
        error: 'Token de acceso requerido',
        message: 'Debe proporcionar un token de autenticación válido'
      });
      return;
    }

    // Validación del JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET no está configurado');
      res.status(500).json({ 
        success: false,
        error: 'Error de configuración',
        message: 'Error interno del servidor'
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      id_usuario: string;
      iat: number;
      exp: number;
    };
    
    // Validación robusta del ID de usuario
    const userId = parseInt(decoded.id_usuario);
    if (isNaN(userId) || userId <= 0) {
      res.status(403).json({ 
        success: false,
        error: 'Token inválido',
        message: 'ID de usuario inválido en el token'
      });
      return;
    }
    
    // Obtener información completa del usuario desde la base de datos
    const userQuery = `
      SELECT u.id_usuario, u.correo, r.id_rol, r.nombre as rol_nombre
      FROM usuarios u
      INNER JOIN roles r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = $1
    `;
    
    pool.query(userQuery, [userId])
      .then(userResult => {
        if (userResult.rows.length === 0) {
          res.status(403).json({ 
            success: false,
            error: 'Usuario no encontrado',
            message: 'El usuario no existe o está inactivo'
          });
          return;
        }
        
        const userData = userResult.rows[0];
        
        // Obtener permisos basados en el rol desde la configuración interna
        const userPermissions = ROLE_PERMISSIONS[userData.rol_nombre as keyof typeof ROLE_PERMISSIONS] || [];
        
        req.user = {
          id: userId,
          email: userData.correo,
          rol: userData.rol_nombre,
          id_rol: userData.id_rol,
          permisos: userPermissions
        };
        
        next();
      })
      .catch(err => {
        console.error('Error al obtener usuario desde DB:', err);
        res.status(500).json({ 
          success: false,
          error: 'Error de base de datos',
          message: 'Error al obtener información del usuario'
        });
        return;
      });
  } catch (error) {
    console.error('Error en authenticateToken:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        success: false,
        error: 'Token expirado',
        message: 'El token de autenticación ha expirado'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ 
        success: false,
        error: 'Token inválido',
        message: 'El token de autenticación no es válido'
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Error de autenticación',
        message: 'Error interno del servidor durante la autenticación'
      });
    }
    return;
  }
};