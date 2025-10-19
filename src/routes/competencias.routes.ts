import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../middleware/authorization.middleware.js';
import { 
  crearCompetenciaSchema, 
  actualizarCompetenciaSchema, 
  filtrosCompetenciasSchema, 
  idCompetenciaSchema
} from '../schemas/competencias.schema.js';
import { 
  CrearCompetenciaRequest, 
  ActualizarCompetenciaRequest, 
  FiltrosCompetencias, 
  CompetenciaIdParams,
  Competencia,
  CompetenciaConCategoria,
  ApiResponse,
  RespuestaPaginada 
} from '../types/competencias.types.js';

const router = Router();



/**
 * @swagger
 * /competencias:
 *   post:
 *     summary: Crear una nueva competencia
 *     description: Crea una nueva competencia en el sistema
 *     tags: [Competencias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearCompetencia'
 *           example:
 *             titulo: "Hackathon de Innovación"
 *             descripcion: "Competencia de desarrollo de soluciones innovadoras en 48 horas"
 *             cupo: 50
 *             horario: "2024-03-20T09:00:00Z"
 *             id_categoria: 4
 *     responses:
 *       201:
 *         description: Competencia creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Competencia'
 *                 message:
 *                   type: string
 *                   example: "Competencia creada exitosamente"
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos suficientes
 */
router.post('/', authenticateToken, requireAnyPermission(['competencias:create', 'competencias:*']), async (req: Request, res: Response, next) => {
  try {
    const competenciaData = crearCompetenciaSchema.parse(req.body) as CrearCompetenciaRequest;

    // Verificar que la categoría existe si se proporciona
    if (competenciaData.id_categoria) {
      const categoriaQuery = await pool.query(
        'SELECT id_categoria FROM categorias WHERE id_categoria = $1',
        [competenciaData.id_categoria]
      );

      if (categoriaQuery.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'La categoría especificada no existe'
        });
      }
    }

    const insertQuery = `
      INSERT INTO competencias (titulo, descripcion, cupo, horario, id_categoria, id_staff_responsable)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_competencia, titulo, descripcion, cupo, horario, id_categoria, id_staff_responsable, creado_en
    `;

    const values = [
      competenciaData.titulo,
      competenciaData.descripcion,
      competenciaData.cupo,
      competenciaData.horario,
      competenciaData.id_categoria || null,
      competenciaData.id_staff_responsable || null
    ];

    const result = await pool.query(insertQuery, values);
    const newCompetencia = result.rows[0];

    // Obtener información de la categoría si existe
    let competenciaWithCategory: CompetenciaConCategoria = {
      ...newCompetencia,
      categoria: undefined
    };

    if (newCompetencia.id_categoria) {
      const categoriaQuery = await pool.query(
        'SELECT id_categoria, nombre, descripcion FROM categorias WHERE id_categoria = $1',
        [newCompetencia.id_categoria]
      );

      if (categoriaQuery.rows.length > 0) {
        competenciaWithCategory.categoria = categoriaQuery.rows[0];
      }
    }

    const response: ApiResponse<CompetenciaConCategoria> = {
      success: true,
      data: competenciaWithCategory,
      message: 'Competencia creada exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /competencias:
 *   get:
 *     summary: Listar competencias con filtros y paginación
 *     description: Obtiene una lista paginada de competencias con filtros opcionales
 *     tags: [Competencias]
 *     parameters:
 *       - in: query
 *         name: titulo
 *         schema:
 *           type: string
 *         description: Filtrar por título (búsqueda parcial)
 *       - in: query
 *         name: id_categoria
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de categoría
 *       - in: query
 *         name: fecha_desde
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filtrar competencias desde esta fecha
 *       - in: query
 *         name: fecha_hasta
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filtrar competencias hasta esta fecha
 *       - in: query
 *         name: cupo_minimo
 *         schema:
 *           type: integer
 *         description: Filtrar por cupo mínimo
 *       - in: query
 *         name: cupo_maximo
 *         schema:
 *           type: integer
 *         description: Filtrar por cupo máximo
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página para la paginación
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de competencias por página
 *     responses:
 *       200:
 *         description: Lista de competencias obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Competencia'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     pagina_actual:
 *                       type: integer
 *                       example: 1
 *                     total_paginas:
 *                       type: integer
 *                       example: 3
 *                     total_registros:
 *                       type: integer
 *                       example: 25
 *                     limite:
 *                       type: integer
 *                       example: 10
 *                 message:
 *                   type: string
 *                   example: "Competencias encontradas"
 *       400:
 *         description: Error de validación en los parámetros
 */
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const filtros = filtrosCompetenciasSchema.parse(req.query) as FiltrosCompetencias;

    // Construir la consulta base
    let baseQuery = `
      FROM competencias c
      LEFT JOIN categorias cat ON c.id_categoria = cat.id_categoria
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Aplicar filtros
    if (filtros.titulo) {
      baseQuery += ` AND c.titulo ILIKE $${paramIndex}`;
      queryParams.push(`%${filtros.titulo}%`);
      paramIndex++;
    }

    if (filtros.id_categoria) {
      baseQuery += ` AND c.id_categoria = $${paramIndex}`;
      queryParams.push(filtros.id_categoria);
      paramIndex++;
    }

    if (filtros.fecha_desde) {
      baseQuery += ` AND c.horario >= $${paramIndex}`;
      queryParams.push(filtros.fecha_desde);
      paramIndex++;
    }

    if (filtros.fecha_hasta) {
      baseQuery += ` AND c.horario <= $${paramIndex}`;
      queryParams.push(filtros.fecha_hasta);
      paramIndex++;
    }

    if (filtros.cupo_minimo) {
      baseQuery += ` AND c.cupo >= $${paramIndex}`;
      queryParams.push(filtros.cupo_minimo);
      paramIndex++;
    }

    if (filtros.cupo_maximo) {
      baseQuery += ` AND c.cupo <= $${paramIndex}`;
      queryParams.push(filtros.cupo_maximo);
      paramIndex++;
    }

    // Contar total de registros
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRegistros = parseInt(countResult.rows[0].total);

    // Calcular paginación
    const totalPaginas = Math.ceil(totalRegistros / filtros.limite);
    const offset = (filtros.pagina - 1) * filtros.limite;

    // Consulta principal con paginación
    const selectQuery = `
      SELECT 
        c.id_competencia,
        c.titulo,
        c.descripcion,
        c.cupo,
        c.horario,
        c.id_staff_responsable,
        c.creado_en,
        cat.id_categoria,
        cat.nombre as categoria_nombre,
        cat.descripcion as categoria_descripcion
      ${baseQuery}
      ORDER BY c.horario ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(filtros.limite, offset);
    const result = await pool.query(selectQuery, queryParams);

    // Formatear resultados
    const competencias: CompetenciaConCategoria[] = result.rows.map(row => ({
      id_competencia: row.id_competencia,
      titulo: row.titulo,
      descripcion: row.descripcion,
      cupo: row.cupo,
      horario: row.horario,
      id_staff_responsable: row.id_staff_responsable,
      creado_en: row.creado_en,
      categoria: row.id_categoria ? {
        id_categoria: row.id_categoria,
        nombre: row.categoria_nombre,
        descripcion: row.categoria_descripcion
      } : undefined
    }));

    const response: RespuestaPaginada<CompetenciaConCategoria> = {
      success: true,
      data: competencias,
      pagination: {
        pagina_actual: filtros.pagina,
        total_paginas: totalPaginas,
        total_registros: totalRegistros,
        limite: filtros.limite
      },
      message: 'Competencias encontradas'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /competencias/{id}:
 *   get:
 *     summary: Obtener una competencia por ID
 *     description: Obtiene la información detallada de una competencia específica
 *     tags: [Competencias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la competencia
 *     responses:
 *       200:
 *         description: Competencia encontrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Competencia'
 *                 message:
 *                   type: string
 *                   example: "Competencia encontrada"
 *       404:
 *         description: Competencia no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: ID inválido
 */
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = idCompetenciaSchema.parse(req.params) as CompetenciaIdParams;

    const query = `
      SELECT 
        c.id_competencia,
        c.titulo,
        c.descripcion,
        c.cupo,
        c.horario,
        c.id_staff_responsable,
        c.creado_en,
        cat.id_categoria,
        cat.nombre as categoria_nombre,
        cat.descripcion as categoria_descripcion
      FROM competencias c
      LEFT JOIN categorias cat ON c.id_categoria = cat.id_categoria
      WHERE c.id_competencia = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Competencia no encontrada'
      });
    }

    const row = result.rows[0];
    const competencia: CompetenciaConCategoria = {
      id_competencia: row.id_competencia,
      titulo: row.titulo,
      descripcion: row.descripcion,
      cupo: row.cupo,
      horario: row.horario,
      id_staff_responsable: row.id_staff_responsable,
      creado_en: row.creado_en,
      categoria: row.id_categoria ? {
        id_categoria: row.id_categoria,
        nombre: row.categoria_nombre,
        descripcion: row.categoria_descripcion
      } : undefined
    };

    const response: ApiResponse<CompetenciaConCategoria> = {
      success: true,
      data: competencia,
      message: 'Competencia encontrada'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /competencias/{id}:
 *   put:
 *     summary: Actualizar una competencia
 *     description: Actualiza la información de una competencia específica
 *     tags: [Competencias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la competencia
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarCompetencia'
 *           example:
 *             titulo: "Hackathon de Innovación - Actualizado"
 *             descripcion: "Competencia de desarrollo de soluciones innovadoras con IA en 48 horas"
 *             cupo: 60
 *             horario: "2024-03-20T10:00:00Z"
 *             id_categoria: 4
 *     responses:
 *       200:
 *         description: Competencia actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Competencia'
 *                 message:
 *                   type: string
 *                   example: "Competencia actualizada exitosamente"
 *       400:
 *         description: Error de validación o datos faltantes
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Competencia no encontrada
 */
router.put('/:id', authenticateToken, requireAnyPermission(['competencias:update', 'competencias:*']), async (req: Request, res: Response, next) => {
  try {
    const { id } = idCompetenciaSchema.parse(req.params) as CompetenciaIdParams;
    const updateData = actualizarCompetenciaSchema.parse(req.body) as ActualizarCompetenciaRequest;

    // Verificar que la competencia existe
    const existingCompetencia = await pool.query(
      'SELECT id_competencia FROM competencias WHERE id_competencia = $1',
      [id]
    );

    if (existingCompetencia.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Competencia no encontrada'
      });
    }

    // Verificar que la categoría existe si se proporciona
    if (updateData.id_categoria) {
      const categoriaQuery = await pool.query(
        'SELECT id_categoria FROM categorias WHERE id_categoria = $1',
        [updateData.id_categoria]
      );

      if (categoriaQuery.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'La categoría especificada no existe'
        });
      }
    }

    // Construir la consulta de actualización dinámicamente
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updateData.titulo !== undefined) {
      updateFields.push(`titulo = $${paramIndex}`);
      updateValues.push(updateData.titulo);
      paramIndex++;
    }

    if (updateData.descripcion !== undefined) {
      updateFields.push(`descripcion = $${paramIndex}`);
      updateValues.push(updateData.descripcion);
      paramIndex++;
    }

    if (updateData.cupo !== undefined) {
      updateFields.push(`cupo = $${paramIndex}`);
      updateValues.push(updateData.cupo);
      paramIndex++;
    }

    if (updateData.horario !== undefined) {
      updateFields.push(`horario = $${paramIndex}`);
      updateValues.push(updateData.horario);
      paramIndex++;
    }

    if (updateData.id_categoria !== undefined) {
      updateFields.push(`id_categoria = $${paramIndex}`);
      updateValues.push(updateData.id_categoria);
      paramIndex++;
    }

    if (updateData.id_staff_responsable !== undefined) {
      updateFields.push(`id_staff_responsable = $${paramIndex}`);
      updateValues.push(updateData.id_staff_responsable);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar'
      });
    }

    // Agregar el ID al final de los parámetros
    updateValues.push(id);

    const updateQuery = `
      UPDATE competencias 
      SET ${updateFields.join(', ')}
      WHERE id_competencia = $${paramIndex}
      RETURNING id_competencia, titulo, descripcion, cupo, horario, id_categoria, id_staff_responsable, creado_en
    `;

    const result = await pool.query(updateQuery, updateValues);
    const updatedCompetencia = result.rows[0];

    // Obtener información de la categoría si existe
    let competenciaWithCategory: CompetenciaConCategoria = {
      ...updatedCompetencia,
      categoria: undefined
    };

    if (updatedCompetencia.id_categoria) {
      const categoriaQuery = await pool.query(
        'SELECT id_categoria, nombre, descripcion FROM categorias WHERE id_categoria = $1',
        [updatedCompetencia.id_categoria]
      );

      if (categoriaQuery.rows.length > 0) {
        competenciaWithCategory.categoria = categoriaQuery.rows[0];
      }
    }

    const response: ApiResponse<CompetenciaConCategoria> = {
      success: true,
      data: competenciaWithCategory,
      message: 'Competencia actualizada exitosamente'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /competencias/{id}:
 *   delete:
 *     summary: Eliminar una competencia
 *     description: Elimina una competencia del sistema
 *     tags: [Competencias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la competencia
 *     responses:
 *       200:
 *         description: Competencia eliminada exitosamente
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
 *                   example: "Competencia eliminada exitosamente"
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Competencia no encontrada
 */
router.delete('/:id', authenticateToken, requireAnyPermission(['competencias:delete', 'competencias:*']), async (req: Request, res: Response, next) => {
  try {
    const { id } = idCompetenciaSchema.parse(req.params) as CompetenciaIdParams;

    // Verificar que la competencia existe
    const existingCompetencia = await pool.query(
      'SELECT id_competencia FROM competencias WHERE id_competencia = $1',
      [id]
    );

    if (existingCompetencia.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Competencia no encontrada'
      });
    }

    // Eliminar la competencia
    await pool.query('DELETE FROM competencias WHERE id_competencia = $1', [id]);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Competencia eliminada exitosamente'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;