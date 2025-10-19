import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import  { ZodError } from 'zod';
import { setupSwagger } from './config/swagger.js';
import rolesRouter from './routes/roles.routes.js';
import usuariosRouter from './routes/usuarios.routes.js';
import participantesRouter from './routes/participantes.routes.js';
import forosRouter from './routes/foros.routes.js';
import talleresRouter from './routes/talleres.routes.js';
import competenciasRouter from './routes/competencias.routes.js';
import categoriasRouter from './routes/categorias.routes.js';
import faqRouter from './routes/faq.routes.js';
import inscripcionesRouter from './routes/inscripciones.routes.js';
import asistenciaRouter from './routes/asistencia.routes.js';
import diplomasRouter from './routes/diplomas.routes.js';
import resultadosRouter from './routes/resultados.routes.js';
import viewsRouter from './routes/views.routes.js';


const app = express();

if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
  app.set('trust proxy', 1);
}

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

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
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

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    trustProxy: false
  }
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

setupSwagger(app);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/roles', rolesRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/participantes', participantesRouter);
app.use('/api/foros', forosRouter);
app.use('/api/talleres', talleresRouter);
app.use('/api/competencias', competenciasRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/faq', faqRouter);
app.use('/api/inscripciones', inscripcionesRouter);
app.use('/api/asistencia', asistenciaRouter);
app.use('/api/diplomas', diplomasRouter);
app.use('/api/resultados', resultadosRouter);
app.use('/api/views', viewsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Error en middleware:", err);
  
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

  if (err && typeof err === 'object' && 'code' in err) {
    const pgError = err as any;
    
    if (pgError.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'El registro ya existe'
      });
    }
    
    if (pgError.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Referencia inválida'
      });
    }
  }

  res.status(500).json({ 
    success: false,
    message: "Error interno del servidor" 
  });
});

export default app;
