import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../middleware/authorization.middleware.js';
import { 
  createResultadoSchema, 
  updateResultadoSchema, 
  resultadoIdSchema,
  resultadosQuerySchema
} from '../schemas/resultados.schema.js';
import { 
  Resultado,
  CreateResultado,
  UpdateResultado,
  ResultadoConDetalles,
  ResultadoResponse,
  ResultadoDetallesResponse,
  ResultadoFilters,
  EstadisticasResultados,
  EstadisticasResultadosResponse
} from '../types/resultados.types.js';

const router = Router();

/**
 * @swagger
 * /resultados:
 *   post:
 *     summary: Registrar un nuevo resultado
 *     description: Registra el resultado de un participante en una competencia
 *     tags: [Resultados]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_competencia
 *               - id_usuario
 *               - posicion
 *             properties:
 *               id_competencia:
 *                 type: integer
 *                 description: ID de la competencia
 *               id_usuario:
 *                 type: integer
 *                 description: ID del usuario participante
 *               posicion:
 *                 type: integer
 *                 minimum: 1
 *                 description: Posición obtenida en la competencia
 *               descripcion:
 *                 type: string
 *                 description: Descripción adicional del resultado
 *           example:
 *             id_competencia: 1
 *             id_usuario: 5
 *             posicion: 1
 *             descripcion: "Primer lugar en la competencia de programación"
 *     responses:
 *       201:
 *         description: Resultado registrado exitosamente
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Sin permisos para registrar resultados
 *       409:
 *         description: El usuario ya tiene un resultado registrado para esta competencia
 */
router.post('/', authenticateToken, requireAnyPermission(['resultados:create', 'resultados:*']), async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createResultadoSchema.parse(req.body);
    const { id_competencia, id_usuario, posicion, descripcion } = validatedData;

    // Verificar que el usuario estuvo inscrito en la competencia
    const inscripcionQuery = `
      SELECT i.id_inscripcion 
      FROM inscripciones i
      WHERE i.id_usuario = $1 AND i.id_competencia = $2
    `;
    const inscripcionResult = await pool.query(inscripcionQuery, [id_usuario, id_competencia]);

    if (inscripcionResult.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: 'El usuario no está inscrito en esta competencia'
      });
      return;
    }

    // Verificar que no exista ya un resultado para este usuario en esta competencia
    const existeResultadoQuery = `
      SELECT id_resultado 
      FROM resultados 
      WHERE id_usuario = $1 AND id_competencia = $2
    `;
    const existeResultado = await pool.query(existeResultadoQuery, [id_usuario, id_competencia]);

    if (existeResultado.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Ya existe un resultado registrado para este usuario en esta competencia'
      });
      return;
    }

    // Insertar el nuevo resultado
    const insertQuery = `
      INSERT INTO resultados (id_competencia, id_usuario, posicion, descripcion)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [id_competencia, id_usuario, posicion, descripcion]);

    const nuevoResultado: Resultado = {
      id_resultado: result.rows[0].id_resultado,
      id_competencia: result.rows[0].id_competencia,
      id_usuario: result.rows[0].id_usuario,
      posicion: result.rows[0].posicion,
      descripcion: result.rows[0].descripcion,
      creado_en: result.rows[0].creado_en
    };

    res.status(201).json({
      success: true,
      data: nuevoResultado,
      message: 'Resultado registrado exitosamente'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.issues
      });
      return;
    }

    console.error('Error al registrar resultado:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /resultados:
 *   get:
 *     summary: Obtener todos los resultados
 *     description: Obtiene una lista de todos los resultados con filtros opcionales
 *     tags: [Resultados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_competencia
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de competencia
 *       - in: query
 *         name: id_usuario
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de usuario
 *       - in: query
 *         name: posicion
 *         schema:
 *           type: integer
 *         description: Filtrar por posición
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Límite de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Desplazamiento para paginación
 *     responses:
 *       200:
 *         description: Lista de resultados obtenida exitosamente
 *       403:
 *         description: Sin permisos para ver resultados
 */
router.get('/', authenticateToken, requireAnyPermission(['resultados:read', 'resultados:*']), async (req: Request, res: Response): Promise<void> => {
  try {
    const queryParams = resultadosQuerySchema.parse(req.query);
    const { id_competencia, id_usuario, posicion, limit = 50, offset = 0 } = queryParams;

    let whereConditions: string[] = [];
    let queryValues: any[] = [];
    let paramCounter = 1;

    // Construir condiciones WHERE dinámicamente
    if (id_competencia !== undefined) {
      whereConditions.push(`r.id_competencia = $${paramCounter}`);
      queryValues.push(id_competencia);
      paramCounter++;
    }

    if (id_usuario !== undefined) {
      whereConditions.push(`r.id_usuario = $${paramCounter}`);
      queryValues.push(id_usuario);
      paramCounter++;
    }

    if (posicion !== undefined) {
      whereConditions.push(`r.posicion = $${paramCounter}`);
      queryValues.push(posicion);
      paramCounter++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query principal con información detallada
    const query = `
      SELECT 
        r.id_resultado,
        r.id_competencia,
        r.id_usuario,
        r.posicion,
        r.descripcion,
        r.creado_en,
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido,
        u.correo as usuario_correo,
        u.foto_url as usuario_foto_url,
        c.titulo as competencia_titulo,
        c.descripcion as competencia_descripcion
      FROM resultados r
      INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
      INNER JOIN competencias c ON r.id_competencia = c.id_competencia
      ${whereClause}
      ORDER BY r.id_competencia, r.posicion
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    queryValues.push(limit, offset);

    const result = await pool.query(query, queryValues);

    const resultados: ResultadoConDetalles[] = result.rows.map(row => ({
      id_resultado: row.id_resultado,
      id_competencia: row.id_competencia,
      id_usuario: row.id_usuario,
      posicion: row.posicion,
      descripcion: row.descripcion,
      creado_en: row.creado_en,
      usuario_nombre: row.usuario_nombre,
      usuario_apellido: row.usuario_apellido,
      usuario_correo: row.usuario_correo,
      usuario_foto_url: row.usuario_foto_url,
      competencia_titulo: row.competencia_titulo,
      competencia_descripcion: row.competencia_descripcion
    }));

    // Query para contar el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM resultados r
      INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
      INNER JOIN competencias c ON r.id_competencia = c.id_competencia
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryValues.slice(0, -2)); // Excluir limit y offset
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: resultados,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Parámetros de consulta inválidos',
        details: error.issues
      });
      return;
    }

    console.error('Error al obtener resultados:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /resultados/{id}:
 *   get:
 *     summary: Obtener un resultado por ID
 *     description: Obtiene los detalles de un resultado específico
 *     tags: [Resultados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del resultado
 *     responses:
 *       200:
 *         description: Resultado obtenido exitosamente
 *       404:
 *         description: Resultado no encontrado
 *       403:
 *         description: Sin permisos para ver este resultado
 */
router.get('/:id', authenticateToken, requireAnyPermission(['resultados:read', 'resultados:*']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = resultadoIdSchema.parse(req.params);

    const query = `
      SELECT 
        r.id_resultado,
        r.id_competencia,
        r.id_usuario,
        r.posicion,
        r.descripcion,
        r.creado_en,
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido,
        u.correo as usuario_correo,
        u.foto_url as usuario_foto_url,
        c.titulo as competencia_titulo,
        c.descripcion as competencia_descripcion
      FROM resultados r
      INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
      INNER JOIN competencias c ON r.id_competencia = c.id_competencia
      WHERE r.id_resultado = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Resultado no encontrado'
      });
      return;
    }

    const row = result.rows[0];
    const resultado: ResultadoConDetalles = {
      id_resultado: row.id_resultado,
      id_competencia: row.id_competencia,
      id_usuario: row.id_usuario,
      posicion: row.posicion,
      descripcion: row.descripcion,
      creado_en: row.creado_en,
      usuario_nombre: row.usuario_nombre,
      usuario_apellido: row.usuario_apellido,
      usuario_correo: row.usuario_correo,
      usuario_foto_url: row.usuario_foto_url,
      competencia_titulo: row.competencia_titulo,
      competencia_descripcion: row.competencia_descripcion
    };

    res.json({
      success: true,
      data: resultado
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'ID inválido'
      });
      return;
    }

    console.error('Error al obtener resultado:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /resultados/{id}:
 *   put:
 *     summary: Actualizar un resultado
 *     description: Actualiza los datos de un resultado existente
 *     tags: [Resultados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del resultado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_competencia:
 *                 type: integer
 *                 description: ID de la competencia
 *               id_usuario:
 *                 type: integer
 *                 description: ID del usuario participante
 *               posicion:
 *                 type: integer
 *                 minimum: 1
 *                 description: Posición obtenida en la competencia
 *               descripcion:
 *                 type: string
 *                 description: Descripción adicional del resultado
 *           example:
 *             posicion: 2
 *             descripcion: "Segundo lugar en la competencia de programación"
 *     responses:
 *       200:
 *         description: Resultado actualizado exitosamente
 *       404:
 *         description: Resultado no encontrado
 *       403:
 *         description: Sin permisos para actualizar resultados
 */
router.put('/:id', authenticateToken, requireAnyPermission(['resultados:update', 'resultados:*']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = resultadoIdSchema.parse(req.params);
    const validatedData = updateResultadoSchema.parse(req.body);

    // Verificar que el resultado existe
    const existeQuery = 'SELECT * FROM resultados WHERE id_resultado = $1';
    const existeResult = await pool.query(existeQuery, [id]);

    if (existeResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Resultado no encontrado'
      });
      return;
    }

    // Si se está cambiando el usuario o la competencia, verificar la inscripción
    if (validatedData.id_usuario || validatedData.id_competencia) {
      const currentData = existeResult.rows[0];
      const newUserId = validatedData.id_usuario || currentData.id_usuario;
      const newCompetenciaId = validatedData.id_competencia || currentData.id_competencia;

      const inscripcionQuery = `
        SELECT i.id_inscripcion 
        FROM inscripciones i
        WHERE i.id_usuario = $1 AND i.id_competencia = $2
      `;
      const inscripcionResult = await pool.query(inscripcionQuery, [newUserId, newCompetenciaId]);

      if (inscripcionResult.rows.length === 0) {
        res.status(400).json({
          success: false,
          error: 'El usuario no está inscrito en esta competencia'
        });
        return;
      }

      // Verificar que no exista otro resultado para la nueva combinación usuario-competencia
      if (validatedData.id_usuario || validatedData.id_competencia) {
        const duplicadoQuery = `
          SELECT id_resultado 
          FROM resultados 
          WHERE id_usuario = $1 AND id_competencia = $2 AND id_resultado != $3
        `;
        const duplicadoResult = await pool.query(duplicadoQuery, [newUserId, newCompetenciaId, id]);

        if (duplicadoResult.rows.length > 0) {
          res.status(409).json({
            success: false,
            error: 'Ya existe un resultado para este usuario en esta competencia'
          });
          return;
        }
      }
    }

    // Construir la query de actualización dinámicamente
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCounter = 1;

    if (validatedData.id_competencia !== undefined) {
      updateFields.push(`id_competencia = $${paramCounter}`);
      updateValues.push(validatedData.id_competencia);
      paramCounter++;
    }

    if (validatedData.id_usuario !== undefined) {
      updateFields.push(`id_usuario = $${paramCounter}`);
      updateValues.push(validatedData.id_usuario);
      paramCounter++;
    }

    if (validatedData.posicion !== undefined) {
      updateFields.push(`posicion = $${paramCounter}`);
      updateValues.push(validatedData.posicion);
      paramCounter++;
    }

    if (validatedData.descripcion !== undefined) {
      updateFields.push(`descripcion = $${paramCounter}`);
      updateValues.push(validatedData.descripcion);
      paramCounter++;
    }

    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No se proporcionaron campos para actualizar'
      });
      return;
    }

    updateValues.push(id);

    const updateQuery = `
      UPDATE resultados 
      SET ${updateFields.join(', ')}
      WHERE id_resultado = $${paramCounter}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    const resultadoActualizado: Resultado = {
      id_resultado: result.rows[0].id_resultado,
      id_competencia: result.rows[0].id_competencia,
      id_usuario: result.rows[0].id_usuario,
      posicion: result.rows[0].posicion,
      descripcion: result.rows[0].descripcion,
      creado_en: result.rows[0].creado_en
    };

    res.json({
      success: true,
      data: resultadoActualizado,
      message: 'Resultado actualizado exitosamente'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: error.issues
      });
      return;
    }

    console.error('Error al actualizar resultado:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /resultados/{id}:
 *   delete:
 *     summary: Eliminar un resultado
 *     description: Elimina un resultado del sistema
 *     tags: [Resultados]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del resultado
 *     responses:
 *       200:
 *         description: Resultado eliminado exitosamente
 *       404:
 *         description: Resultado no encontrado
 *       403:
 *         description: Sin permisos para eliminar resultados
 */
router.delete('/:id', authenticateToken, requireAnyPermission(['resultados:delete', 'resultados:*']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = resultadoIdSchema.parse(req.params);

    // Verificar que el resultado existe
    const existeQuery = 'SELECT * FROM resultados WHERE id_resultado = $1';
    const existeResult = await pool.query(existeQuery, [id]);

    if (existeResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Resultado no encontrado'
      });
      return;
    }

    // Eliminar el resultado
    const deleteQuery = 'DELETE FROM resultados WHERE id_resultado = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: 'Resultado eliminado exitosamente',
      data: {
        id_resultado: result.rows[0].id_resultado
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'ID inválido'
      });
      return;
    }

    console.error('Error al eliminar resultado:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /resultados/estadisticas:
 *   get:
 *     summary: Obtener estadísticas de resultados
 *     description: Obtiene estadísticas generales de los resultados de competencias
 *     tags: [Resultados]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
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
 *                   example: "Estadísticas obtenidas exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_resultados:
 *                       type: integer
 *                       description: Total de resultados registrados
 *                     total_competencias_con_resultados:
 *                       type: integer
 *                       description: Total de competencias que tienen resultados
 *                     total_participantes_con_resultados:
 *                       type: integer
 *                       description: Total de participantes con resultados
 *                     distribucion_posiciones:
 *                       type: object
 *                       properties:
 *                         primer_lugar:
 *                           type: integer
 *                         segundo_lugar:
 *                           type: integer
 *                         tercer_lugar:
 *                           type: integer
 *                         otras_posiciones:
 *                           type: integer
 *                     resultados_por_competencia:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id_competencia:
 *                             type: integer
 *                           titulo_competencia:
 *                             type: string
 *                           total_resultados:
 *                             type: integer
 *                     top_participantes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id_usuario:
 *                             type: integer
 *                           nombre_completo:
 *                             type: string
 *                           total_participaciones:
 *                             type: integer
 *                           mejores_posiciones:
 *                             type: integer
 *       403:
 *         description: Sin permisos para ver estadísticas
 *       500:
 *         description: Error interno del servidor
 */
router.get('/estadisticas', authenticateToken, requireAnyPermission(['resultados:read', 'resultados:*']), async (req: Request, res: Response): Promise<void> => {
  try {
    // Estadísticas generales
    const statsGeneralesQuery = `
      SELECT 
        COUNT(*) as total_resultados,
        COUNT(DISTINCT id_competencia) as total_competencias_con_resultados,
        COUNT(DISTINCT id_usuario) as total_participantes_con_resultados
      FROM resultados
    `;
    const statsGeneralesResult = await pool.query(statsGeneralesQuery);

    // Distribución de posiciones
    const distribucionQuery = `
      SELECT 
        COUNT(CASE WHEN posicion = 1 THEN 1 END) as primer_lugar,
        COUNT(CASE WHEN posicion = 2 THEN 1 END) as segundo_lugar,
        COUNT(CASE WHEN posicion = 3 THEN 1 END) as tercer_lugar,
        COUNT(CASE WHEN posicion > 3 THEN 1 END) as otras_posiciones
      FROM resultados
    `;
    const distribucionResult = await pool.query(distribucionQuery);

    // Resultados por competencia
    const resultadosPorCompetenciaQuery = `
      SELECT 
        r.id_competencia,
        c.titulo as titulo_competencia,
        COUNT(r.id_resultado) as total_resultados
      FROM resultados r
      INNER JOIN competencias c ON r.id_competencia = c.id_competencia
      GROUP BY r.id_competencia, c.titulo
      ORDER BY total_resultados DESC
      LIMIT 10
    `;
    const resultadosPorCompetenciaResult = await pool.query(resultadosPorCompetenciaQuery);

    // Top participantes (con más participaciones y mejores posiciones)
    const topParticipantesQuery = `
      SELECT 
        r.id_usuario,
        CONCAT(u.nombre, ' ', u.apellido) as nombre_completo,
        COUNT(r.id_resultado) as total_participaciones,
        COUNT(CASE WHEN r.posicion <= 3 THEN 1 END) as mejores_posiciones
      FROM resultados r
      INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
      GROUP BY r.id_usuario, u.nombre, u.apellido
      ORDER BY mejores_posiciones DESC, total_participaciones DESC
      LIMIT 10
    `;
    const topParticipantesResult = await pool.query(topParticipantesQuery);

    const estadisticas: EstadisticasResultados = {
      total_resultados: parseInt(statsGeneralesResult.rows[0].total_resultados),
      total_competencias_con_resultados: parseInt(statsGeneralesResult.rows[0].total_competencias_con_resultados),
      total_participantes_con_resultados: parseInt(statsGeneralesResult.rows[0].total_participantes_con_resultados),
      distribucion_posiciones: {
        primer_lugar: parseInt(distribucionResult.rows[0].primer_lugar),
        segundo_lugar: parseInt(distribucionResult.rows[0].segundo_lugar),
        tercer_lugar: parseInt(distribucionResult.rows[0].tercer_lugar),
        otras_posiciones: parseInt(distribucionResult.rows[0].otras_posiciones)
      },
      resultados_por_competencia: resultadosPorCompetenciaResult.rows.map(row => ({
        id_competencia: row.id_competencia,
        titulo_competencia: row.titulo_competencia,
        total_resultados: parseInt(row.total_resultados)
      })),
      top_participantes: topParticipantesResult.rows.map(row => ({
        id_usuario: row.id_usuario,
        nombre_completo: row.nombre_completo,
        total_participaciones: parseInt(row.total_participaciones),
        mejores_posiciones: parseInt(row.mejores_posiciones)
      }))
    };

    const response: EstadisticasResultadosResponse = {
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: estadisticas
    };

    res.json(response);

  } catch (error) {
    console.error('Error al obtener estadísticas de resultados:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router;