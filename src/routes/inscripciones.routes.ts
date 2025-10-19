import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../middleware/authorization.middleware.js';
import { 
  crearInscripcionSchema, 
  listarInscripcionesQuerySchema, 
  inscripcionParamsSchema 
} from '../schemas/inscripciones.schemas.js';
import { 
  InscripcionCompleta, 
  CrearInscripcionResponse,
  ListarInscripcionesResponse,
  InscripcionResponse,
  EliminarInscripcionResponse,
  CrearInscripcionRequest,
  InscripcionParams,
  ListarInscripcionesQuery
} from '../types/inscripciones.types.js';

const router = Router();

// Función auxiliar para mapear filas de base de datos a InscripcionCompleta
const mapRowToInscripcionCompleta = (row: any): InscripcionCompleta => {
  return {
    id_inscripcion: row.id_inscripcion,
    id_usuario: row.id_usuario,
    id_tipo: row.id_tipo,
    id_taller: row.id_taller,
    id_competencia: row.id_competencia,
    id_foro: row.id_foro,
    fecha_inscripcion: row.fecha_inscripcion,
    usuario: {
      id_usuario: row.usuario_id,
      nombre: row.usuario_nombre,
      apellido: row.usuario_apellido,
      correo: row.usuario_correo,
      telefono: row.usuario_telefono,
      colegio: row.usuario_colegio,
      tipo: row.usuario_tipo
    },
    tipo_evento: {
      id_tipo: row.tipo_id,
      nombre: row.tipo_nombre
    },
    taller: row.taller_id ? {
      id_taller: row.taller_id,
      titulo: row.taller_titulo,
      descripcion: row.taller_descripcion,
      cupo: row.taller_cupo,
      horario: row.taller_horario
    } : undefined,
    competencia: row.competencia_id ? {
      id_competencia: row.competencia_id,
      titulo: row.competencia_titulo,
      descripcion: row.competencia_descripcion,
      cupo: row.competencia_cupo,
      horario: row.competencia_horario
    } : undefined,
    foro: row.foro_id ? {
      id_foro: row.foro_id,
      titulo: row.foro_titulo,
      descripcion: row.foro_descripcion,
      fecha_creacion: row.foro_fecha_creacion,
      estado: row.foro_estado
    } : undefined
  };
};



/**
 * @swagger
 * /api/inscripciones:
 *   post:
 *     summary: Crear nueva inscripción
 *     description: Permite a un participante inscribirse en un taller o competencia. Solo participantes pueden crear inscripciones para sí mismos.
 *     tags: [Inscripciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearInscripcionRequest'
 *     responses:
 *       201:
 *         description: Inscripción creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Inscripción creada exitosamente"
 *                 inscripcion:
 *                   $ref: '#/components/schemas/Inscripcion'
 *       400:
 *         description: Error en los datos de entrada o reglas de negocio
 *       401:
 *         description: Token de autenticación requerido
 *       403:
 *         description: Sin permisos para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', authenticateToken, requirePermission('inscripciones:create_self'), async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = crearInscripcionSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: validationResult.error.issues
      });
      return;
    }

    const { id_taller, id_competencia, id_foro } = validationResult.data;
    const id_usuario = (req as any).user.id;

    // Verificar si ya existe una inscripción
    const existeQuery = `
      SELECT id_inscripcion 
      FROM inscripciones 
      WHERE id_usuario = $1 AND (id_taller = $2 OR id_competencia = $3 OR id_foro = $4)
    `;
    const existeResult = await pool.query(existeQuery, [id_usuario, id_taller || null, id_competencia || null, id_foro || null]);
    
    if (existeResult.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Ya estás inscrito en este evento'
      });
      return;
    }

    // Verificar cupo y que el evento esté activo
    let eventoQuery: string;
    let eventoValues: any[];
    
    if (id_taller) {
      eventoQuery = `
        SELECT 
          t.cupo,
          t.horario,
          COALESCE(COUNT(i.id_inscripcion), 0) as inscripciones_actuales
        FROM talleres t
        LEFT JOIN inscripciones i ON i.id_taller = t.id_taller
        WHERE t.id_taller = $1 AND t.horario > NOW()
        GROUP BY t.cupo, t.horario
      `;
      eventoValues = [id_taller];
    } else if (id_competencia) {
      eventoQuery = `
        SELECT 
          c.cupo,
          c.horario,
          COALESCE(COUNT(i.id_inscripcion), 0) as inscripciones_actuales
        FROM competencias c
        LEFT JOIN inscripciones i ON i.id_competencia = c.id_competencia
        WHERE c.id_competencia = $1 AND c.horario > NOW()
        GROUP BY c.cupo, c.horario
      `;
      eventoValues = [id_competencia];
    } else {
      // Para foros, no hay cupo ni horario específico, solo verificar que esté activo
      eventoQuery = `
        SELECT 
          999999 as cupo,
          NOW() as horario,
          COALESCE(COUNT(i.id_inscripcion), 0) as inscripciones_actuales
        FROM foros f
        LEFT JOIN inscripciones i ON i.id_foro = f.id_foro
        WHERE f.id_foro = $1 AND f.estado = 'A'
        GROUP BY f.id_foro
      `;
      eventoValues = [id_foro];
    }

    const eventoResult = await pool.query(eventoQuery, eventoValues);
    
    if (eventoResult.rows.length === 0) {
      res.status(400).json({
        success: false,
        message: 'El evento no existe o ya ha pasado'
      });
      return;
    }

    const evento = eventoResult.rows[0];
    const cupoDisponible = evento.cupo - evento.inscripciones_actuales;
    
    if (cupoDisponible <= 0) {
      res.status(400).json({
        success: false,
        message: 'No hay cupos disponibles para este evento'
      });
      return;
    }

    // Crear la inscripción
    const id_tipo = id_taller ? 1 : id_competencia ? 2 : id_foro ? 3 : 0; // 1 = Taller, 2 = Competencia, 3 = Foro
    
    const insertQuery = `
      INSERT INTO inscripciones (id_usuario, id_tipo, id_taller, id_competencia, id_foro, fecha_inscripcion)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    
    const insertValues = [id_usuario, id_tipo, id_taller || null, id_competencia || null, id_foro || null];
    const insertResult = await pool.query(insertQuery, insertValues);

    const response: CrearInscripcionResponse = {
      success: true,
      message: 'Inscripción creada exitosamente',
      inscripcion: insertResult.rows[0]
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error al crear inscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/inscripciones:
 *   get:
 *     summary: Listar inscripciones
 *     description: Obtiene una lista paginada de inscripciones. Los participantes solo ven sus propias inscripciones, mientras que admin/organizador/staff pueden ver todas.
 *     tags: [Inscripciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de usuario
 *       - in: query
 *         name: id_tipo
 *         schema:
 *           type: integer
 *         description: Filtrar por tipo de evento (1=Taller, 2=Competencia)
 *       - in: query
 *         name: id_taller
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de taller
 *       - in: query
 *         name: id_competencia
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de competencia
 *       - in: query
 *         name: fecha_desde
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar desde fecha (YYYY-MM-DD)
 *       - in: query
 *         name: fecha_hasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar hasta fecha (YYYY-MM-DD)
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Elementos por página
 *     responses:
 *       200:
 *         description: Lista de inscripciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 inscripciones:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Inscripcion'
 *                 total:
 *                   type: integer
 *                   description: Total de inscripciones
 *                 pagina:
 *                   type: integer
 *                   description: Página actual
 *                 limite:
 *                   type: integer
 *                   description: Límite por página
 *                 totalPaginas:
 *                   type: integer
 *                   description: Total de páginas
 *       401:
 *         description: Token de autenticación requerido
 *       403:
 *         description: Sin permisos para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', authenticateToken, requireAnyPermission(['inscripciones:read', 'inscripciones:read_self']), async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = listarInscripcionesQuerySchema.safeParse(req.query);
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: 'Parámetros de consulta inválidos',
        errors: validationResult.error.issues.map(error => ({
          field: error.path.join('.'),
          message: error.message
        }))
      });
      return;
    }

    const { id_usuario, id_tipo, id_taller, id_competencia, id_foro, fecha_desde, fecha_hasta, pagina, limite } = validationResult.data;
    const user = (req as any).user;

    // Si es participante, solo puede ver sus propias inscripciones
    const filtroUsuario = user.rol === 'participante' ? user.id_usuario : id_usuario;

    // Construir condiciones WHERE
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filtroUsuario) {
      conditions.push(`i.id_usuario = $${paramIndex++}`);
      values.push(filtroUsuario);
    }

    if (id_tipo) {
      conditions.push(`i.id_tipo = $${paramIndex++}`);
      values.push(id_tipo);
    }

    if (id_taller) {
      conditions.push(`i.id_taller = $${paramIndex++}`);
      values.push(id_taller);
    }

    if (id_competencia) {
      conditions.push(`i.id_competencia = $${paramIndex++}`);
      values.push(id_competencia);
    }

    if (id_foro) {
      conditions.push(`i.id_foro = $${paramIndex++}`);
      values.push(id_foro);
    }

    if (fecha_desde) {
      conditions.push(`DATE(i.fecha_inscripcion) >= $${paramIndex++}`);
      values.push(fecha_desde);
    }

    if (fecha_hasta) {
      conditions.push(`DATE(i.fecha_inscripcion) <= $${paramIndex++}`);
      values.push(fecha_hasta);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query para obtener inscripciones
    const inscripcionesQuery = `
      SELECT 
        i.*,
        u.id_usuario as usuario_id, u.nombre as usuario_nombre, u.apellido as usuario_apellido,
        u.correo as usuario_correo, u.telefono as usuario_telefono, u.colegio as usuario_colegio, u.tipo as usuario_tipo,
        te.id_tipo as tipo_id, te.nombre as tipo_nombre,
        t.id_taller as taller_id, t.titulo as taller_titulo, t.descripcion as taller_descripcion, 
        t.cupo as taller_cupo, t.horario as taller_horario,
        c.id_competencia as competencia_id, c.titulo as competencia_titulo, c.descripcion as competencia_descripcion,
        c.cupo as competencia_cupo, c.horario as competencia_horario,
        f.id_foro as foro_id, f.titulo as foro_titulo, f.descripcion as foro_descripcion,
        f.fecha_creacion as foro_fecha_creacion, f.estado as foro_estado
      FROM inscripciones i
      INNER JOIN usuarios u ON i.id_usuario = u.id_usuario
      INNER JOIN tipos_evento te ON i.id_tipo = te.id_tipo
      LEFT JOIN talleres t ON i.id_taller = t.id_taller
      LEFT JOIN competencias c ON i.id_competencia = c.id_competencia
      LEFT JOIN foros f ON i.id_foro = f.id_foro
      ${whereClause}
      ORDER BY i.fecha_inscripcion DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM inscripciones i
      INNER JOIN usuarios u ON i.id_usuario = u.id_usuario
      INNER JOIN tipos_evento te ON i.id_tipo = te.id_tipo
      LEFT JOIN talleres t ON i.id_taller = t.id_taller
      LEFT JOIN competencias c ON i.id_competencia = c.id_competencia
      LEFT JOIN foros f ON i.id_foro = f.id_foro
      ${whereClause}
    `;

    const offset = (pagina - 1) * limite;
    values.push(limite, offset);

    const [inscripcionesResult, countResult] = await Promise.all([
      pool.query(inscripcionesQuery, values),
      pool.query(countQuery, values.slice(0, -2)) // Excluir limit y offset para el count
    ]);

    const inscripciones: InscripcionCompleta[] = inscripcionesResult.rows.map(mapRowToInscripcionCompleta);
    const total = parseInt(countResult.rows[0].total);
    const totalPaginas = Math.ceil(total / limite);

    const response: ListarInscripcionesResponse = {
      inscripciones,
      total,
      pagina,
      limite,
      totalPaginas
    };

    res.json(response);
  } catch (error) {
    console.error('Error al listar inscripciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/inscripciones/{id}:
 *   get:
 *     summary: Obtener inscripción por ID
 *     description: Obtiene los detalles de una inscripción específica. Los participantes solo pueden ver sus propias inscripciones.
 *     tags: [Inscripciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la inscripción
 *     responses:
 *       200:
 *         description: Inscripción obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 inscripcion:
 *                   $ref: '#/components/schemas/Inscripcion'
 *       404:
 *         description: Inscripción no encontrada
 *       401:
 *         description: Token de autenticación requerido
 *       403:
 *         description: Sin permisos para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', authenticateToken, requireAnyPermission(['inscripciones:read', 'inscripciones:read_self']), async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = inscripcionParamsSchema.safeParse(req.params);
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: 'ID de inscripción inválido',
        errors: validationResult.error.issues.map(error => ({
          field: error.path.join('.'),
          message: error.message
        }))
      });
      return;
    }

    const { id } = validationResult.data;
    const user = (req as any).user;

    // Si es participante, solo puede ver sus propias inscripciones
    const whereClause = user.rol === 'participante' 
      ? 'WHERE i.id_inscripcion = $1 AND i.id_usuario = $2'
      : 'WHERE i.id_inscripcion = $1';

    const query = `
      SELECT 
        i.*,
        u.id_usuario as usuario_id, u.nombre as usuario_nombre, u.apellido as usuario_apellido,
        u.correo as usuario_correo, u.telefono as usuario_telefono, u.colegio as usuario_colegio, u.tipo as usuario_tipo,
        te.id_tipo as tipo_id, te.nombre as tipo_nombre,
        t.id_taller as taller_id, t.titulo as taller_titulo, t.descripcion as taller_descripcion, 
        t.cupo as taller_cupo, t.horario as taller_horario,
        c.id_competencia as competencia_id, c.titulo as competencia_titulo, c.descripcion as competencia_descripcion,
        c.cupo as competencia_cupo, c.horario as competencia_horario,
        f.id_foro as foro_id, f.titulo as foro_titulo, f.descripcion as foro_descripcion,
        f.fecha_creacion as foro_fecha_creacion, f.estado as foro_estado
      FROM inscripciones i
      INNER JOIN usuarios u ON i.id_usuario = u.id_usuario
      INNER JOIN tipos_evento te ON i.id_tipo = te.id_tipo
      LEFT JOIN talleres t ON i.id_taller = t.id_taller
      LEFT JOIN competencias c ON i.id_competencia = c.id_competencia
      LEFT JOIN foros f ON i.id_foro = f.id_foro
      ${whereClause}
    `;

    const values = user.rol === 'participante' ? [id, user.id_usuario] : [id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Inscripción no encontrada'
      });
      return;
    }

    const inscripcion = mapRowToInscripcionCompleta(result.rows[0]);

    const response: InscripcionResponse = {
      success: true,
      inscripcion
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener inscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/inscripciones/{id}:
 *   delete:
 *     summary: Eliminar inscripción
 *     description: Elimina una inscripción existente. Los participantes solo pueden cancelar sus propias inscripciones.
 *     tags: [Inscripciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la inscripción
 *     responses:
 *       200:
 *         description: Inscripción eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Inscripción eliminada exitosamente"
 *       404:
 *         description: Inscripción no encontrada
 *       401:
 *         description: Token de autenticación requerido
 *       403:
 *         description: Sin permisos para realizar esta acción
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', authenticateToken, requireAnyPermission(['inscripciones:delete', 'inscripciones:delete_self']), async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = inscripcionParamsSchema.safeParse(req.params);
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: 'ID de inscripción inválido',
        errors: validationResult.error.issues.map(error => ({
          field: error.path.join('.'),
          message: error.message
        }))
      });
      return;
    }

    const { id } = validationResult.data;
    const user = (req as any).user;

    // Si es participante, solo puede eliminar sus propias inscripciones
    if (user.rol === 'participante') {
      const checkQuery = `SELECT id_usuario FROM inscripciones WHERE id_inscripcion = $1`;
      const checkResult = await pool.query(checkQuery, [id]);
      
      if (checkResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Inscripción no encontrada'
        });
        return;
      }

      if (checkResult.rows[0].id_usuario !== user.id_usuario) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar esta inscripción'
        });
        return;
      }
    }

    const deleteQuery = `DELETE FROM inscripciones WHERE id_inscripcion = $1`;
    const result = await pool.query(deleteQuery, [id]);

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: 'Inscripción no encontrada'
      });
      return;
    }

    const response: EliminarInscripcionResponse = {
      success: true,
      message: 'Inscripción eliminada exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error al eliminar inscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;