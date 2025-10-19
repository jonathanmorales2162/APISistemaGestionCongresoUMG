import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../middleware/authorization.middleware.js';
import { 
  crearTallerSchema, 
  actualizarTallerSchema, 
  filtrosTalleresSchema, 
  idTallerSchema
} from '../schemas/talleres.schema.js';
import { 
  CrearTallerRequest, 
  ActualizarTallerRequest, 
  FiltrosTalleres, 
  TallerIdParams,
  Taller,
  TallerConCategoria,
  ApiResponse,
  RespuestaPaginada 
} from '../types/talleres.types.js';

const router = Router();



/**
 * @swagger
 * /talleres:
 *   post:
 *     summary: Crear un nuevo taller
 *     description: Crea un nuevo taller en el sistema
 *     tags: [Talleres]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearTaller'
 *           example:
 *             titulo: "Introducción a React"
 *             descripcion: "Aprende los fundamentos de React para desarrollo web moderno"
 *             cupo: 30
 *             horario: "2024-03-15T14:00:00Z"
 *             id_categoria: 4
 *     responses:
 *       201:
 *         description: Taller creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Taller'
 *                 message:
 *                   type: string
 *                   example: "Taller creado exitosamente"
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
router.post('/', authenticateToken, requireAnyPermission(['talleres:create', 'talleres:*']), async (req: Request, res: Response, next) => {
  try {
    const tallerData = crearTallerSchema.parse(req.body) as CrearTallerRequest;

    // Verificar que la categoría existe si se proporciona
    if (tallerData.id_categoria) {
      const categoriaQuery = await pool.query(
        'SELECT id_categoria FROM categorias WHERE id_categoria = $1',
        [tallerData.id_categoria]
      );

      if (categoriaQuery.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'La categoría especificada no existe'
        });
      }
    }

    const insertQuery = `
      INSERT INTO talleres (titulo, descripcion, cupo, horario, id_categoria, id_staff_ponente)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_taller, titulo, descripcion, cupo, horario, id_categoria, id_staff_ponente, creado_en
    `;

    const values = [
      tallerData.titulo,
      tallerData.descripcion,
      tallerData.cupo,
      tallerData.horario,
      tallerData.id_categoria || null,
      tallerData.id_staff_ponente || null
    ];

    const result = await pool.query(insertQuery, values);
    const newTaller = result.rows[0];

    // Obtener información de la categoría si existe
    let tallerWithCategory: TallerConCategoria = {
      ...newTaller,
      categoria: undefined
    };

    if (newTaller.id_categoria) {
      const categoriaQuery = await pool.query(
        'SELECT id_categoria, nombre, descripcion FROM categorias WHERE id_categoria = $1',
        [newTaller.id_categoria]
      );

      if (categoriaQuery.rows.length > 0) {
        tallerWithCategory.categoria = categoriaQuery.rows[0];
      }
    }

    const response: ApiResponse<TallerConCategoria> = {
      success: true,
      data: tallerWithCategory,
      message: 'Taller creado exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /talleres:
 *   get:
 *     summary: Listar talleres con filtros y paginación
 *     description: Obtiene una lista paginada de talleres con filtros opcionales
 *     tags: [Talleres]
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
 *         description: Filtrar talleres desde esta fecha
 *       - in: query
 *         name: fecha_hasta
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filtrar talleres hasta esta fecha
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
 *         description: Cantidad de talleres por página
 *     responses:
 *       200:
 *         description: Lista de talleres obtenida exitosamente
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
 *                     $ref: '#/components/schemas/Taller'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     pagina_actual:
 *                       type: integer
 *                       example: 1
 *                     total_paginas:
 *                       type: integer
 *                       example: 5
 *                     total_registros:
 *                       type: integer
 *                       example: 47
 *                     limite:
 *                       type: integer
 *                       example: 10
 *                 message:
 *                   type: string
 *                   example: "Talleres encontrados"
 *       400:
 *         description: Error de validación en los parámetros
 */
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const filtros = filtrosTalleresSchema.parse(req.query) as FiltrosTalleres;

    // Construir la consulta base
    let baseQuery = `
      FROM talleres t
      LEFT JOIN categorias c ON t.id_categoria = c.id_categoria
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Aplicar filtros
    if (filtros.titulo) {
      baseQuery += ` AND t.titulo ILIKE $${paramIndex}`;
      queryParams.push(`%${filtros.titulo}%`);
      paramIndex++;
    }

    if (filtros.id_categoria) {
      baseQuery += ` AND t.id_categoria = $${paramIndex}`;
      queryParams.push(filtros.id_categoria);
      paramIndex++;
    }

    if (filtros.fecha_desde) {
      baseQuery += ` AND t.horario >= $${paramIndex}`;
      queryParams.push(filtros.fecha_desde);
      paramIndex++;
    }

    if (filtros.fecha_hasta) {
      baseQuery += ` AND t.horario <= $${paramIndex}`;
      queryParams.push(filtros.fecha_hasta);
      paramIndex++;
    }

    if (filtros.cupo_minimo) {
      baseQuery += ` AND t.cupo >= $${paramIndex}`;
      queryParams.push(filtros.cupo_minimo);
      paramIndex++;
    }

    if (filtros.cupo_maximo) {
      baseQuery += ` AND t.cupo <= $${paramIndex}`;
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
        t.id_taller,
        t.titulo,
        t.descripcion,
        t.cupo,
        t.horario,
        t.id_staff_ponente,
        t.creado_en,
        c.id_categoria,
        c.nombre as categoria_nombre,
        c.descripcion as categoria_descripcion
      ${baseQuery}
      ORDER BY t.horario ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(filtros.limite, offset);
    const result = await pool.query(selectQuery, queryParams);

    // Formatear resultados
    const talleres: TallerConCategoria[] = result.rows.map(row => ({
      id_taller: row.id_taller,
      titulo: row.titulo,
      descripcion: row.descripcion,
      cupo: row.cupo,
      horario: row.horario,
      id_staff_ponente: row.id_staff_ponente,
      creado_en: row.creado_en,
      categoria: row.id_categoria ? {
        id_categoria: row.id_categoria,
        nombre: row.categoria_nombre,
        descripcion: row.categoria_descripcion
      } : undefined
    }));

    const response: RespuestaPaginada<TallerConCategoria> = {
      success: true,
      data: talleres,
      pagination: {
        pagina_actual: filtros.pagina,
        total_paginas: totalPaginas,
        total_registros: totalRegistros,
        limite: filtros.limite
      },
      message: 'Talleres encontrados'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /talleres/{id}:
 *   get:
 *     summary: Obtener un taller por ID
 *     description: Obtiene la información detallada de un taller específico
 *     tags: [Talleres]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del taller
 *     responses:
 *       200:
 *         description: Taller encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Taller'
 *                 message:
 *                   type: string
 *                   example: "Taller encontrado"
 *       404:
 *         description: Taller no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: ID inválido
 */
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = idTallerSchema.parse(req.params) as TallerIdParams;

    const query = `
      SELECT 
        t.id_taller,
        t.titulo,
        t.descripcion,
        t.cupo,
        t.horario,
        t.id_staff_ponente,
        t.creado_en,
        c.id_categoria,
        c.nombre as categoria_nombre,
        c.descripcion as categoria_descripcion
      FROM talleres t
      LEFT JOIN categorias c ON t.id_categoria = c.id_categoria
      WHERE t.id_taller = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Taller no encontrado'
      });
    }

    const row = result.rows[0];
    const taller: TallerConCategoria = {
      id_taller: row.id_taller,
      titulo: row.titulo,
      descripcion: row.descripcion,
      cupo: row.cupo,
      horario: row.horario,
      id_staff_ponente: row.id_staff_ponente,
      creado_en: row.creado_en,
      categoria: row.id_categoria ? {
        id_categoria: row.id_categoria,
        nombre: row.categoria_nombre,
        descripcion: row.categoria_descripcion
      } : undefined
    };

    const response: ApiResponse<TallerConCategoria> = {
      success: true,
      data: taller,
      message: 'Taller encontrado'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /talleres/{id}:
 *   put:
 *     summary: Actualizar un taller
 *     description: Actualiza la información de un taller específico
 *     tags: [Talleres]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del taller
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarTaller'
 *           example:
 *             titulo: "Introducción a React - Actualizado"
 *             descripcion: "Aprende los fundamentos de React y hooks para desarrollo web moderno"
 *             cupo: 35
 *             horario: "2024-03-15T15:00:00Z"
 *             id_categoria: 4
 *     responses:
 *       200:
 *         description: Taller actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Taller'
 *                 message:
 *                   type: string
 *                   example: "Taller actualizado exitosamente"
 *       400:
 *         description: Error de validación o datos faltantes
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Taller no encontrado
 */
router.put('/:id', authenticateToken, requireAnyPermission(['talleres:update', 'talleres:*']), async (req: Request, res: Response, next) => {
  try {
    const { id } = idTallerSchema.parse(req.params) as TallerIdParams;
    const updateData = actualizarTallerSchema.parse(req.body) as ActualizarTallerRequest;

    // Verificar que el taller existe
    const existingTaller = await pool.query(
      'SELECT id_taller FROM talleres WHERE id_taller = $1',
      [id]
    );

    if (existingTaller.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Taller no encontrado'
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

    if (updateData.id_staff_ponente !== undefined) {
      updateFields.push(`id_staff_ponente = $${paramIndex}`);
      updateValues.push(updateData.id_staff_ponente);
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
      UPDATE talleres 
      SET ${updateFields.join(', ')}
      WHERE id_taller = $${paramIndex}
      RETURNING id_taller, titulo, descripcion, cupo, horario, id_categoria, id_staff_ponente, creado_en
    `;

    const result = await pool.query(updateQuery, updateValues);
    const updatedTaller = result.rows[0];

    // Obtener información de la categoría si existe
    let tallerWithCategory: TallerConCategoria = {
      ...updatedTaller,
      categoria: undefined
    };

    if (updatedTaller.id_categoria) {
      const categoriaQuery = await pool.query(
        'SELECT id_categoria, nombre, descripcion FROM categorias WHERE id_categoria = $1',
        [updatedTaller.id_categoria]
      );

      if (categoriaQuery.rows.length > 0) {
        tallerWithCategory.categoria = categoriaQuery.rows[0];
      }
    }

    const response: ApiResponse<TallerConCategoria> = {
      success: true,
      data: tallerWithCategory,
      message: 'Taller actualizado exitosamente'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /talleres/{id}:
 *   delete:
 *     summary: Eliminar un taller
 *     description: Elimina un taller del sistema
 *     tags: [Talleres]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del taller
 *     responses:
 *       200:
 *         description: Taller eliminado exitosamente
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
 *                   example: "Taller eliminado exitosamente"
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos suficientes
 *       404:
 *         description: Taller no encontrado
 */
router.delete('/:id', authenticateToken, requireAnyPermission(['talleres:delete', 'talleres:*']), async (req: Request, res: Response, next) => {
  try {
    const { id } = idTallerSchema.parse(req.params) as TallerIdParams;

    // Verificar que el taller existe
    const existingTaller = await pool.query(
      'SELECT id_taller FROM talleres WHERE id_taller = $1',
      [id]
    );

    if (existingTaller.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Taller no encontrado'
      });
    }

    // Eliminar el taller
    await pool.query('DELETE FROM talleres WHERE id_taller = $1', [id]);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Taller eliminado exitosamente'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;