import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/authorization.middleware.js';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/**
 * GET /api/views/talleres
 * Consulta la vista vw_talleres_detalle
 * Retorna talleres con su categoría, ponente y número de inscritos
 * Parámetros opcionales: ?categoria= y ?ponente= para filtrar resultados
 */
router.get('/talleres', async (req: Request, res: Response) => {
  try {
    const { categoria, ponente } = req.query;
    
    let query = 'SELECT * FROM vw_talleres_detalle WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    // Filtro por categoría
    if (categoria) {
      paramCount++;
      query += ` AND categoria_nombre ILIKE $${paramCount}`;
      params.push(`%${categoria}%`);
    }

    // Filtro por ponente
    if (ponente) {
      paramCount++;
      query += ` AND instructor ILIKE $${paramCount}`;
      params.push(`%${ponente}%`);
    }

    query += ' ORDER BY fecha_inicio ASC';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al consultar talleres:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al consultar talleres'
    });
  }
});

/**
 * GET /api/views/competencias
 * Consulta la vista vw_competencias_detalle
 * Retorna competencias con su categoría, responsable y ganadores
 * Parámetros opcionales: ?categoria= y ?responsable= para filtrar resultados
 */
router.get('/competencias', async (req: Request, res: Response) => {
  try {
    const { categoria, responsable } = req.query;
    
    let query = 'SELECT * FROM vw_competencias_detalle WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    // Filtro por categoría
    if (categoria) {
      paramCount++;
      query += ` AND categoria_nombre ILIKE $${paramCount}`;
      params.push(`%${categoria}%`);
    }

    // Filtro por responsable
    if (responsable) {
      paramCount++;
      query += ` AND responsable ILIKE $${paramCount}`;
      params.push(`%${responsable}%`);
    }

    query += ' ORDER BY fecha_inicio ASC';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al consultar competencias:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al consultar competencias'
    });
  }
});

/**
 * GET /api/views/inscripciones/:id_usuario
 * Consulta la vista vw_inscripciones_usuario
 * Retorna todas las inscripciones de un usuario específico
 * Admin y Organizador pueden consultar cualquier usuario
 * Participante solo puede acceder a sus propias inscripciones
 */
router.get('/inscripciones/:id_usuario', async (req: Request, res: Response) => {
  try {
    const { id_usuario } = req.params;
    const userFromToken = (req as any).user;

    // Verificar permisos: Admin y Organizador pueden ver cualquier usuario
    // Participante solo puede ver sus propias inscripciones
    const hasFullAccess = userFromToken.permisos.includes('inscripciones:read');
    const requestedUserId = parseInt(id_usuario);
    
    if (!hasFullAccess && userFromToken.id_usuario !== requestedUserId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para consultar las inscripciones de este usuario'
      });
    }

    const query = 'SELECT * FROM vw_inscripciones_usuario WHERE id_usuario = $1 ORDER BY fecha_inscripcion DESC';
    const result = await pool.query(query, [id_usuario]);

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al consultar inscripciones del usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al consultar inscripciones del usuario'
    });
  }
});

/**
 * GET /api/views/asistencia
 * Consulta la vista vw_asistencia_detalle
 * Lista todas las asistencias con participante, actividad y estado
 * Permitir filtros opcionales por ?id_usuario= o ?tipo=
 */
router.get('/asistencia', requirePermission('asistencia:read'), async (req: Request, res: Response) => {
  try {
    const { id_usuario, tipo } = req.query;
    
    let query = 'SELECT * FROM vw_asistencia_detalle WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    // Filtro por usuario
    if (id_usuario) {
      paramCount++;
      query += ` AND id_usuario = $${paramCount}`;
      params.push(id_usuario);
    }

    // Filtro por tipo de actividad
    if (tipo) {
      paramCount++;
      query += ` AND tipo_actividad = $${paramCount}`;
      params.push(tipo);
    }

    query += ' ORDER BY fecha_registro DESC';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al consultar asistencia:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al consultar asistencia'
    });
  }
});

/**
 * GET /api/views/diplomas
 * Consulta la vista vw_diplomas_emitidos
 * Devuelve diplomas generados con información del participante y actividad
 * Parámetro opcional: ?id_usuario= para filtrar diplomas personales
 */
router.get('/diplomas', async (req: Request, res: Response) => {
  try {
    const { id_usuario } = req.query;
    const userFromToken = (req as any).user;
    
    let query = 'SELECT * FROM vw_diplomas_emitidos WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    // Si es participante, solo puede ver sus propios diplomas
    if (!userFromToken.permisos.includes('diplomas:read')) {
      paramCount++;
      query += ` AND id_usuario = $${paramCount}`;
      params.push(userFromToken.id_usuario);
    } else if (id_usuario) {
      // Admin, Organizador o Staff pueden filtrar por usuario específico
      paramCount++;
      query += ` AND id_usuario = $${paramCount}`;
      params.push(id_usuario);
    }

    query += ' ORDER BY fecha_generacion DESC';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al consultar diplomas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al consultar diplomas'
    });
  }
});

/**
 * GET /api/views/resultados
 * Consulta la vista vw_resultados_publicos
 * Vista pública que devuelve los ganadores (posiciones 1 a 3) de competencias
 */
router.get('/resultados', async (req: Request, res: Response) => {
  try {
    const query = 'SELECT * FROM vw_resultados_publicos ORDER BY id_competencia ASC, posicion ASC';
    const result = await pool.query(query);

    res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al consultar resultados públicos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al consultar resultados públicos'
    });
  }
});

export default router;