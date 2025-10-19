import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAnyPermission } from '../middleware/authorization.middleware.js';
import { 
  crearDiplomaSchema, 
  filtrosDiplomasSchema, 
  diplomaIdSchema,
  CrearDiplomaInput,
  FiltrosDiplomasInput,
  DiplomaIdInput
} from '../schemas/diplomas.schema.js';
import { 
  Diploma, 
  DiplomaConDetalles, 
  RespuestaDiplomas 
} from '../types/diplomas.types.js';

const router = Router();

/**
 * @swagger
 * /api/diplomas:
 *   post:
 *     summary: Generar un nuevo diploma
 *     description: Genera un diploma para un usuario que tiene asistencia registrada en un taller o competencia
 *     tags: [Diplomas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearDiplomaRequest'
 *           examples:
 *             taller:
 *               summary: Diploma para taller
 *               value:
 *                 id_usuario: "1"
 *                 id_taller: "2"
 *             competencia:
 *               summary: Diploma para competencia
 *               value:
 *                 id_usuario: "1"
 *                 id_competencia: "1"
 *     responses:
 *       201:
 *         description: Diploma generado exitosamente
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
 *                   example: "Diploma generado exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Diploma'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos para generar diplomas
 *       404:
 *         description: Usuario o evento no encontrado
 *       409:
 *         description: El diploma ya existe o el usuario no tiene asistencia registrada
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/', 
  authenticateToken, 
  requireAnyPermission(['diplomas:generate']),
  async (req: Request, res: Response) => {
    try {
      const validatedData: CrearDiplomaInput = crearDiplomaSchema.parse(req.body);
      const { id_usuario, id_taller, id_competencia } = validatedData;

      // Determinar el tipo de evento
      const id_tipo = id_taller ? 1 : 2; // 1 = Taller, 2 = Competencia
      const evento_id = id_taller || id_competencia;

      // Verificar que el usuario existe
      const usuarioQuery = 'SELECT id_usuario FROM usuarios WHERE id_usuario = $1';
      const usuarioResult = await pool.query(usuarioQuery, [id_usuario]);
      
      if (usuarioResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar que el evento existe
      const eventoTable = id_taller ? 'talleres' : 'competencias';
      const eventoIdColumn = id_taller ? 'id_taller' : 'id_competencia';
      const eventoQuery = `SELECT ${eventoIdColumn} FROM ${eventoTable} WHERE ${eventoIdColumn} = $1`;
      const eventoResult = await pool.query(eventoQuery, [evento_id]);
      
      if (eventoResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `${id_taller ? 'Taller' : 'Competencia'} no encontrado`
        });
      }

      // Verificar que el usuario tiene asistencia registrada para este evento
      const asistenciaQuery = `
        SELECT id_asistencia 
        FROM asistencia 
        WHERE id_usuario = $1 
        AND ${id_taller ? 'id_taller' : 'id_competencia'} = $2
        AND estado = 'P'
      `;
      const asistenciaResult = await pool.query(asistenciaQuery, [id_usuario, evento_id]);
      
      if (asistenciaResult.rows.length === 0) {
        return res.status(409).json({
          success: false,
          message: 'El usuario debe tener asistencia registrada como presente para generar el diploma'
        });
      }

      // Verificar que no existe ya un diploma para este usuario y evento
      const diplomaExistenteQuery = `
        SELECT id_diploma 
        FROM diplomas 
        WHERE id_usuario = $1 
        AND ${id_taller ? 'id_taller' : 'id_competencia'} = $2
      `;
      const diplomaExistenteResult = await pool.query(diplomaExistenteQuery, [id_usuario, evento_id]);
      
      if (diplomaExistenteResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe un diploma para este usuario y evento'
        });
      }

      // Generar el diploma
      const insertQuery = `
        INSERT INTO diplomas (id_usuario, id_tipo, ${id_taller ? 'id_taller' : 'id_competencia'})
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const insertResult = await pool.query(insertQuery, [id_usuario, id_tipo, evento_id]);
      
      const nuevoDiploma = insertResult.rows[0];

      res.status(201).json({
        success: true,
        message: 'Diploma generado exitosamente',
        data: nuevoDiploma
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors
        });
      }

      console.error('Error al generar diploma:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

/**
 * @swagger
 * /api/diplomas:
 *   get:
 *     summary: Obtener lista de diplomas
 *     description: Obtiene una lista paginada de diplomas con filtros opcionales
 *     tags: [Diplomas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_usuario
 *         schema:
 *           type: string
 *         description: Filtrar por ID de usuario
 *       - in: query
 *         name: id_taller
 *         schema:
 *           type: string
 *         description: Filtrar por ID de taller
 *       - in: query
 *         name: id_competencia
 *         schema:
 *           type: string
 *         description: Filtrar por ID de competencia
 *       - in: query
 *         name: fecha_desde
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filtrar desde fecha (ISO 8601)
 *       - in: query
 *         name: fecha_hasta
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filtrar hasta fecha (ISO 8601)
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Número de resultados por página
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *     responses:
 *       200:
 *         description: Lista de diplomas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RespuestaDiplomas'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos para ver diplomas
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', 
  authenticateToken, 
  requireAnyPermission(['diplomas:read', 'diplomas:read_self']),
  async (req: Request, res: Response) => {
    try {
      const validatedQuery: FiltrosDiplomasInput = filtrosDiplomasSchema.parse(req.query);
      const { 
        id_usuario, 
        id_taller, 
        id_competencia, 
        fecha_desde, 
        fecha_hasta, 
        limite = 10, 
        pagina = 1 
      } = validatedQuery;

      const offset = (pagina - 1) * limite;
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      // Control de acceso: participantes solo pueden ver sus propios diplomas
      const userRole = (req as any).user?.rol;
      const userId = (req as any).user?.id;
      
      if (userRole === 'participante') {
        conditions.push(`d.id_usuario = $${++paramCount}`);
        values.push(userId);
      } else if (id_usuario) {
        conditions.push(`d.id_usuario = $${++paramCount}`);
        values.push(id_usuario);
      }

      if (id_taller) {
        conditions.push(`d.id_taller = $${++paramCount}`);
        values.push(id_taller);
      }

      if (id_competencia) {
        conditions.push(`d.id_competencia = $${++paramCount}`);
        values.push(id_competencia);
      }

      if (fecha_desde) {
        conditions.push(`d.fecha_generacion >= $${++paramCount}`);
        values.push(fecha_desde);
      }

      if (fecha_hasta) {
        conditions.push(`d.fecha_generacion <= $${++paramCount}`);
        values.push(fecha_hasta);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Consulta para obtener diplomas con detalles
      const diplomasQuery = `
        SELECT 
          d.id_diploma,
          d.id_usuario,
          d.id_tipo,
          d.id_taller,
          d.id_competencia,
          d.fecha_generacion,
          d.archivo_pdf,
          u.nombre as usuario_nombre,
          u.apellido as usuario_apellido,
          u.correo as usuario_correo,
          t.titulo as taller_titulo,
          c.titulo as competencia_titulo,
          te.nombre as tipo_evento
        FROM diplomas d
        INNER JOIN usuarios u ON d.id_usuario = u.id_usuario
        LEFT JOIN talleres t ON d.id_taller = t.id_taller
        LEFT JOIN competencias c ON d.id_competencia = c.id_competencia
        INNER JOIN tipos_evento te ON d.id_tipo = te.id_tipo
        ${whereClause}
        ORDER BY d.fecha_generacion DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;

      values.push(limite, offset);
      const diplomasResult = await pool.query(diplomasQuery, values);

      // Consulta para obtener el total de registros
      const countQuery = `
        SELECT COUNT(*) as total
        FROM diplomas d
        INNER JOIN usuarios u ON d.id_usuario = u.id_usuario
        LEFT JOIN talleres t ON d.id_taller = t.id_taller
        LEFT JOIN competencias c ON d.id_competencia = c.id_competencia
        INNER JOIN tipos_evento te ON d.id_tipo = te.id_tipo
        ${whereClause}
      `;

      const countValues = values.slice(0, -2); // Remover limite y offset
      const countResult = await pool.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0].total);

      const respuesta: RespuestaDiplomas = {
        diplomas: diplomasResult.rows,
        total,
        pagina,
        limite,
        total_paginas: Math.ceil(total / limite)
      };

      res.json({
        success: true,
        data: respuesta
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors
        });
      }

      console.error('Error al obtener diplomas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

/**
 * @swagger
 * /api/diplomas/{id}:
 *   get:
 *     summary: Obtener diploma por ID
 *     description: Obtiene los detalles de un diploma específico por su ID
 *     tags: [Diplomas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del diploma
 *     responses:
 *       200:
 *         description: Diploma obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Diploma'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos para ver este diploma
 *       404:
 *         description: Diploma no encontrado
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', 
  authenticateToken, 
  requireAnyPermission(['diplomas:read', 'diplomas:read_self']),
  async (req: Request, res: Response) => {
    try {
      const { id }: DiplomaIdInput = diplomaIdSchema.parse(req.params);

      const diplomaQuery = `
        SELECT 
          d.id_diploma,
          d.id_usuario,
          d.id_tipo,
          d.id_taller,
          d.id_competencia,
          d.fecha_generacion,
          d.archivo_pdf,
          u.nombre as usuario_nombre,
          u.apellido as usuario_apellido,
          u.correo as usuario_correo,
          t.titulo as taller_titulo,
          c.titulo as competencia_titulo,
          te.nombre as tipo_evento
        FROM diplomas d
        INNER JOIN usuarios u ON d.id_usuario = u.id_usuario
        LEFT JOIN talleres t ON d.id_taller = t.id_taller
        LEFT JOIN competencias c ON d.id_competencia = c.id_competencia
        INNER JOIN tipos_evento te ON d.id_tipo = te.id_tipo
        WHERE d.id_diploma = $1
      `;

      const diplomaResult = await pool.query(diplomaQuery, [id]);

      if (diplomaResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Diploma no encontrado'
        });
      }

      const diploma = diplomaResult.rows[0];

      // Control de acceso: participantes solo pueden ver sus propios diplomas
      const userRole = (req as any).user?.rol;
      const userId = (req as any).user?.id;
      
      if (userRole === 'participante' && diploma.id_usuario !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este diploma'
        });
      }

      res.json({
        success: true,
        data: diploma
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Error de validación',
          errors: error.errors
        });
      }

      console.error('Error al obtener diploma:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

export default router;