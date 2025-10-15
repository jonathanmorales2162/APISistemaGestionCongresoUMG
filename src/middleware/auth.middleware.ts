import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        rol: string;
      };
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ 
      error: 'Token de acceso requerido',
      message: 'Debe proporcionar un token de autenticación válido'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id_usuario: string;
      iat: number;
      exp: number;
    };
    
    req.user = {
      id: parseInt(decoded.id_usuario),
      email: '', // We'll get this from the database if needed
      rol: ''    // We'll get this from the database if needed
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        error: 'Token expirado',
        message: 'El token de autenticación ha expirado'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ 
        error: 'Token inválido',
        message: 'El token de autenticación no es válido'
      });
    } else {
      res.status(500).json({ 
        error: 'Error de autenticación',
        message: 'Error interno del servidor durante la autenticación'
      });
    }
    return;
  }
};