import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/authorization.middleware.js';
import { 
  crearFaqSchema, 
  actualizarFaqSchema, 
  faqParamsSchema,
  filtrosFaqSchema,
  cambiarEstadoFaqSchema
} from '../schemas/faq.schema.js';
import {
  CrearFaqRequest,
  ActualizarFaqRequest,
  CambiarEstadoFaqRequest,
  ListarFaqsQuery,
  FaqParams,
  Faq,
  ListarFaqsResponse,
  EstadisticasFaq,
  FaqResponse,
  FaqListResponse,
  EstadisticasFaqResponse
} from '../types/faq.types.js';

const router = Router();

/**
 * @swagger
 * /api/faq:
 *   get:
 *     summary: Obtener lista de FAQs
 *     description: Obtiene una lista paginada de preguntas frecuentes
 *     tags: [FAQ]
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Número de elementos por página
 *       - in: query
 *         name: pregunta
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Término de búsqueda en pregunta
 *       - in: query
 *         name: id_categoria
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Filtrar por categoría
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [A, I]
 *         description: Filtrar por estado (A=Activo, I=Inactivo)
 *     responses:
 *       200:
 *         description: Lista de FAQs obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FaqListResponse'
 *       400:
 *         description: Parámetros de consulta inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Validar parámetros de consulta
    const queryValidation = filtrosFaqSchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros de consulta inválidos',
        errors: queryValidation.error.issues
      });
    }

    const { pagina, limite, pregunta, estado } = queryValidation.data;
    const offset = (pagina - 1) * limite;

    // Construir condiciones WHERE dinámicamente
    const conditions: string[] = [];
    const params: any[] = [limite, offset];
    let paramIndex = 3;

    if (pregunta) {
      conditions.push(`LOWER(f.pregunta) LIKE LOWER($${paramIndex})`);
      params.push(`%${pregunta}%`);
      paramIndex++;
    }

    if (estado) {
      conditions.push(`f.estado = $${paramIndex}`);
      params.push(estado);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Obtener total de FAQs
    const countQuery = `
      SELECT COUNT(*) as total
      FROM faq f
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(2));
    const total = parseInt(countResult.rows[0].total);

    // Obtener FAQs paginadas
    const faqsQuery = `
      SELECT 
        f.id_faq,
        f.pregunta,
        f.respuesta,
        f.estado,
        f.fecha_creacion
      FROM faq f
      ${whereClause}
      ORDER BY f.fecha_creacion DESC
      LIMIT $1 OFFSET $2
    `;
    const faqsResult = await pool.query(faqsQuery, params);

    const totalPaginas = Math.ceil(total / limite);

    const response: FaqListResponse = {
      success: true,
      message: 'FAQs obtenidas exitosamente',
      data: {
        faqs: faqsResult.rows,
        paginacion: {
          pagina_actual: pagina,
          total_paginas: totalPaginas,
          total_registros: total,
          limite
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener FAQs:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/faq/estadisticas:
 *   get:
 *     summary: Obtener estadísticas de FAQs
 *     description: Obtiene estadísticas generales de las preguntas frecuentes
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EstadisticasFaqResponse'
 *       401:
 *         description: Token de autenticación requerido
 *       500:
 *         description: Error interno del servidor
 */
router.get('/estadisticas', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Estadísticas generales
    const statsQuery = `
      SELECT 
        COUNT(*) as total_faqs,
        COUNT(CASE WHEN estado = 'A' THEN 1 END) as faqs_activas,
        COUNT(CASE WHEN estado = 'I' THEN 1 END) as faqs_inactivas
      FROM faq
    `;
    const statsResult = await pool.query(statsQuery);

    const estadisticas: EstadisticasFaq = {
      total_faqs: parseInt(statsResult.rows[0].total_faqs),
      faqs_activas: parseInt(statsResult.rows[0].faqs_activas),
      faqs_inactivas: parseInt(statsResult.rows[0].faqs_inactivas)
    };

    const response: EstadisticasFaqResponse = {
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: estadisticas
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener estadísticas de FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/faq/{id}:
 *   get:
 *     summary: Obtener FAQ por ID
 *     description: Obtiene una pregunta frecuente específica por su ID
 *     tags: [FAQ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID de la FAQ
 *     responses:
 *       200:
 *         description: FAQ obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FaqResponse'
 *       400:
 *         description: ID inválido
 *       404:
 *         description: FAQ no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Validar parámetros
    const paramsValidation = faqParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido',
        errors: paramsValidation.error.issues
      });
    }

    const { id } = paramsValidation.data;

    const faqQuery = `
      SELECT 
        f.id_faq,
        f.pregunta,
        f.respuesta,
        f.estado,
        f.fecha_creacion
      FROM faq f
      WHERE f.id_faq = $1
    `;
    const faqResult = await pool.query(faqQuery, [id]);

    if (faqResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'FAQ no encontrada'
      });
    }

    const response: FaqResponse = {
      success: true,
      message: 'FAQ obtenida exitosamente',
      data: faqResult.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/faq:
 *   post:
 *     summary: Crear nueva FAQ
 *     description: Crea una nueva pregunta frecuente (solo administradores)
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearFaqRequest'
 *     responses:
 *       201:
 *         description: FAQ creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FaqResponse'
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: Token de autenticación requerido
 *       403:
 *         description: Permisos insuficientes
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', authenticateToken, requirePermission('foros:create'), async (req: Request, res: Response) => {
  try {
    // Validar datos de entrada
    const validation = crearFaqSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: validation.error.issues
      });
    }

    const { pregunta, respuesta, estado } = validation.data;

    // Crear la FAQ
    const insertQuery = `
      INSERT INTO faq (pregunta, respuesta, estado, fecha_creacion)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING id_faq, pregunta, respuesta, estado, fecha_creacion
    `;
    
    const insertResult = await pool.query(insertQuery, [
      pregunta,
      respuesta,
      estado || 'A'
    ]);

    const response: FaqResponse = {
      success: true,
      message: 'FAQ creada exitosamente',
      data: insertResult.rows[0]
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error al crear FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/faq/{id}:
 *   put:
 *     summary: Actualizar FAQ
 *     description: Actualiza una pregunta frecuente existente (solo administradores)
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID de la FAQ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarFaqRequest'
 *     responses:
 *       200:
 *         description: FAQ actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FaqResponse'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token de autenticación requerido
 *       403:
 *         description: Permisos insuficientes
 *       404:
 *         description: FAQ no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', authenticateToken, requirePermission('foros:update'), async (req: Request, res: Response) => {
  try {
    // Validar parámetros
    const paramsValidation = faqParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido',
        errors: paramsValidation.error.issues
      });
    }

    // Validar datos de entrada
    const validation = actualizarFaqSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: validation.error.issues
      });
    }

    const { id } = paramsValidation.data;
    const updateData = validation.data;

    // Verificar que la FAQ existe
    const existeQuery = `SELECT id_faq FROM faq WHERE id_faq = $1`;
    const existeResult = await pool.query(existeQuery, [id]);

    if (existeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'FAQ no encontrada'
      });
    }



    // Construir query de actualización dinámicamente
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    });

    updateValues.push(id);

    const updateQuery = `
      UPDATE faq 
      SET ${updateFields.join(', ')}
      WHERE id_faq = $${paramIndex}
      RETURNING id_faq, pregunta, respuesta, estado, fecha_creacion
    `;

    const updateResult = await pool.query(updateQuery, updateValues);

    const response: FaqResponse = {
      success: true,
      message: 'FAQ actualizada exitosamente',
      data: updateResult.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Error al actualizar FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/faq/{id}/estado:
 *   patch:
 *     summary: Cambiar estado de FAQ
 *     description: Cambia el estado de una FAQ (Activo/Inactivo) - solo administradores
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID de la FAQ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CambiarEstadoFaqRequest'
 *     responses:
 *       200:
 *         description: Estado de FAQ actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FaqResponse'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token de autenticación requerido
 *       403:
 *         description: Permisos insuficientes
 *       404:
 *         description: FAQ no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/:id/estado', authenticateToken, requirePermission('foros:update'), async (req: Request, res: Response) => {
  try {
    // Validar parámetros
    const paramsValidation = faqParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido',
        errors: paramsValidation.error.issues
      });
    }

    // Validar datos de entrada
    const validation = cambiarEstadoFaqSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: validation.error.issues
      });
    }

    const { id } = paramsValidation.data;
    const { estado } = validation.data;

    // Verificar que la FAQ existe
    const existeQuery = `SELECT id_faq FROM faq WHERE id_faq = $1`;
    const existeResult = await pool.query(existeQuery, [id]);

    if (existeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'FAQ no encontrada'
      });
    }

    // Actualizar estado
    const updateQuery = `
      UPDATE faq 
      SET estado = $1
      WHERE id_faq = $2
      RETURNING id_faq, pregunta, respuesta, estado, fecha_creacion
    `;
    const updateResult = await pool.query(updateQuery, [estado, id]);

    const response: FaqResponse = {
      success: true,
      message: `FAQ ${estado === 'A' ? 'activada' : 'desactivada'} exitosamente`,
      data: updateResult.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Error al cambiar estado de FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/faq/{id}:
 *   delete:
 *     summary: Eliminar FAQ
 *     description: Elimina una pregunta frecuente (solo administradores)
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID de la FAQ
 *     responses:
 *       200:
 *         description: FAQ eliminada exitosamente
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
 *                   example: "FAQ eliminada exitosamente"
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Token de autenticación requerido
 *       403:
 *         description: Permisos insuficientes
 *       404:
 *         description: FAQ no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', authenticateToken, requirePermission('foros:delete'), async (req: Request, res: Response) => {
  try {
    // Validar parámetros
    const paramsValidation = faqParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido',
        errors: paramsValidation.error.issues
      });
    }

    const { id } = paramsValidation.data;

    // Verificar que la FAQ existe
    const existeQuery = `SELECT id_faq FROM faq WHERE id_faq = $1`;
    const existeResult = await pool.query(existeQuery, [id]);

    if (existeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'FAQ no encontrada'
      });
    }

    // Eliminar FAQ
    const deleteQuery = `DELETE FROM faq WHERE id_faq = $1`;
    await pool.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: 'FAQ eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});



export default router;