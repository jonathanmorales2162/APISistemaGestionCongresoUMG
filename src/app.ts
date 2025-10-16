import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import  { ZodError } from 'zod';
import { setupSwagger } from './config/swagger.js';
import rolesRouter from './routes/roles.routes.js';
import usuariosRouter from './routes/usuarios.routes.js';
import { databaseErrorHandler, generalErrorHandler } from './middleware/errorHandler.js';

const app = express();

// Configurar trust proxy para Vercel
if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
  app.set('trust proxy', 1);
}

// Seguridad base: reemplazo manual de Helmet
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(hpp());

// CORS configurado para desarrollo y producción
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como Postman, aplicaciones móviles, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('No permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Rate limit genérico
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  // Deshabilitar validaciones problemáticas en Vercel
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    trustProxy: false
  }
}));

// Parsers
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// CORREGIDO: Configuración de Swagger optimizada para Vercel serverless
setupSwagger(app);

// Healthcheck
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Rutas - CORREGIDO: Agregado prefijo /api para compatibilidad con Vercel
app.use('/api/roles', rolesRouter);
app.use('/api/usuarios', usuariosRouter);

// Manejador de errores
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Error en middleware:", err);
  
  // Error de validación Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: err.issues.map(error => ({
        field: error.path.join('.'),
        message: error.message
      }))
    });
  }

  // Error de PostgreSQL
  if (err && typeof err === 'object' && 'code' in err) {
    const pgError = err as any;
    
    // Violación de restricción única
    if (pgError.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'El registro ya existe'
      });
    }
    
    // Violación de clave foránea
    if (pgError.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Referencia inválida'
      });
    }
  }

  // Error genérico
  res.status(500).json({ 
    success: false,
    message: "Error interno del servidor" 
  });
});

export default app;
