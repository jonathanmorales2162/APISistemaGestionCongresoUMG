import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import rolesRouter from './routes/roles.routes.js';

const app = express();

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

// CORS restringido al frontend
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

// Rate limit genérico
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// Parsers
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Healthcheck
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Endpoint de prueba
app.use('/roles', rolesRouter);

// Manejador de errores
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Error en middleware:", err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
