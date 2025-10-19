import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/authorization.middleware.js';
import { 
  crearCategoriaSchema, 
  actualizarCategoriaSchema, 
  listarCategoriasQuerySchema, 
  categoriaParamsSchema
} from '../schemas/categorias.schema.js';
import { 
  CrearCategoriaRequest, 
  ActualizarCategoriaRequest, 
  ListarCategoriasQuery,
  CategoriaParams,
  Categoria,
  ListarCategoriasResponse,
  CategoriaEnUso,
  EliminarCategoriaResponse,
  CategoriaResponse 
} from '../types/categorias.types.js';

const router = Router();



/**
 * @swagger
 * /api/categorias:
 *   get:
 *     summary: Obtener lista de categorías
 *     description: Obtiene una lista paginada de todas las categorías disponibles
 *     tags: [Categorías]
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
 *         name: buscar
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Término de búsqueda en nombre o descripción
 *     responses:
 *       200:
 *         description: Lista de categorías obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListarCategoriasResponse'
 *       400:
 *         description: Parámetros de consulta inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Validar parámetros de consulta
    const queryValidation = listarCategoriasQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros de consulta inválidos',
        errors: queryValidation.error.issues
      });
    }

    const { pagina, limite, buscar } = queryValidation.data;
    const offset = (pagina - 1) * limite;
    const searchPattern = buscar ? `%${buscar}%` : null;

    // Obtener total de categorías
    const countQuery = `
      SELECT COUNT(*) as total
      FROM categorias
      WHERE ($1::text IS NULL OR 
             LOWER(nombre) LIKE LOWER($1) OR 
             LOWER(descripcion) LIKE LOWER($1))
    `;
    const countResult = await pool.query(countQuery, [searchPattern]);
    const total = parseInt(countResult.rows[0].total);

    // Obtener categorías paginadas
    const categoriasQuery = `
      SELECT 
        id_categoria,
        nombre,
        descripcion
      FROM categorias
      WHERE ($3::text IS NULL OR 
             LOWER(nombre) LIKE LOWER($3) OR 
             LOWER(descripcion) LIKE LOWER($3))
      ORDER BY nombre ASC
      LIMIT $1 OFFSET $2
    `;
    const categoriasResult = await pool.query(categoriasQuery, [limite, offset, searchPattern]);

    const totalPaginas = Math.ceil(total / limite);

    const response: ListarCategoriasResponse = {
      categorias: categoriasResult.rows,
      total,
      pagina,
      limite,
      totalPaginas
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/categorias:
 *   post:
 *     summary: Crear nueva categoría
 *     description: Crea una nueva categoría (solo administradores)
 *     tags: [Categorías]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearCategoriaRequest'
 *     responses:
 *       201:
 *         description: Categoría creada exitosamente
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
 *                   example: "Categoría creada exitosamente"
 *                 categoria:
 *                   $ref: '#/components/schemas/Categoria'
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: Token de autenticación requerido
 *       403:
 *         description: Permisos insuficientes
 *       409:
 *         description: Ya existe una categoría con ese nombre
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', authenticateToken, requirePermission('categorias:create'), async (req: Request, res: Response) => {
  try {
    // Validar datos de entrada
    const validation = crearCategoriaSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: validation.error.issues
      });
    }

    const { nombre, descripcion } = validation.data;

    // Verificar si ya existe una categoría con ese nombre
    const existeQuery = `
      SELECT id_categoria FROM categorias 
      WHERE LOWER(nombre) = LOWER($1)
    `;
    const existeResult = await pool.query(existeQuery, [nombre]);

    if (existeResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
    }

    // Crear la categoría
    const crearQuery = `
      INSERT INTO categorias (nombre, descripcion)
      VALUES ($1, $2)
      RETURNING id_categoria, nombre, descripcion
    `;
    const result = await pool.query(crearQuery, [nombre, descripcion]);

    const response: CategoriaResponse = {
      success: true,
      message: 'Categoría creada exitosamente',
      categoria: result.rows[0]
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/categorias/{id}:
 *   get:
 *     summary: Obtener categoría por ID
 *     description: Obtiene los detalles de una categoría específica
 *     tags: [Categorías]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID de la categoría
 *     responses:
 *       200:
 *         description: Categoría encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Categoria'
 *       400:
 *         description: ID de categoría inválido
 *       404:
 *         description: Categoría no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Validar parámetros
    const paramsValidation = categoriaParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'ID de categoría inválido',
        errors: paramsValidation.error.issues
      });
    }

    const { id } = paramsValidation.data;

    // Obtener la categoría
    const query = `
      SELECT 
        id_categoria,
        nombre,
        descripcion
      FROM categorias
      WHERE id_categoria = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/categorias/{id}:
 *   put:
 *     summary: Actualizar categoría
 *     description: Actualiza una categoría existente (solo administradores)
 *     tags: [Categorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID de la categoría
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarCategoriaRequest'
 *     responses:
 *       200:
 *         description: Categoría actualizada exitosamente
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
 *                   example: "Categoría actualizada exitosamente"
 *                 categoria:
 *                   $ref: '#/components/schemas/Categoria'
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: Token de autenticación requerido
 *       403:
 *         description: Permisos insuficientes
 *       404:
 *         description: Categoría no encontrada
 *       409:
 *         description: Ya existe una categoría con ese nombre
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', authenticateToken, requirePermission('categorias:update'), async (req: Request, res: Response) => {
  try {
    // Validar parámetros
    const paramsValidation = categoriaParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'ID de categoría inválido',
        errors: paramsValidation.error.issues
      });
    }

    // Validar datos de entrada
    const bodyValidation = actualizarCategoriaSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: bodyValidation.error.issues
      });
    }

    const { id } = paramsValidation.data;
    const { nombre, descripcion } = bodyValidation.data;

    // Verificar que la categoría existe
    const existeQuery = `SELECT id_categoria FROM categorias WHERE id_categoria = $1`;
    const existeResult = await pool.query(existeQuery, [id]);

    if (existeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    // Si se está actualizando el nombre, verificar que no exista otra categoría con ese nombre
    if (nombre) {
      const nombreExisteQuery = `
        SELECT id_categoria FROM categorias 
        WHERE LOWER(nombre) = LOWER($1) AND id_categoria != $2
      `;
      const nombreExisteResult = await pool.query(nombreExisteQuery, [nombre, id]);

      if (nombreExisteResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre'
        });
      }
    }

    // Actualizar la categoría
    const actualizarQuery = `
      UPDATE categorias
      SET 
        nombre = COALESCE($2, nombre),
        descripcion = COALESCE($3, descripcion)
      WHERE id_categoria = $1
      RETURNING id_categoria, nombre, descripcion
    `;
    const result = await pool.query(actualizarQuery, [id, nombre, descripcion]);

    const response: CategoriaResponse = {
      success: true,
      message: 'Categoría actualizada exitosamente',
      categoria: result.rows[0]
    };

    res.json(response);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/categorias/{id}:
 *   delete:
 *     summary: Eliminar categoría
 *     description: Elimina una categoría si no está siendo utilizada (solo administradores)
 *     tags: [Categorías]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID de la categoría
 *     responses:
 *       200:
 *         description: Categoría eliminada exitosamente
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
 *                   example: "Categoría eliminada exitosamente"
 *       400:
 *         description: ID de categoría inválido
 *       401:
 *         description: Token de autenticación requerido
 *       403:
 *         description: Permisos insuficientes
 *       404:
 *         description: Categoría no encontrada
 *       409:
 *         description: No se puede eliminar la categoría porque está en uso
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', authenticateToken, requirePermission('categorias:delete'), async (req: Request, res: Response) => {
  try {
    // Validar parámetros
    const paramsValidation = categoriaParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        message: 'ID de categoría inválido',
        errors: paramsValidation.error.issues
      });
    }

    const { id } = paramsValidation.data;

    // Verificar que la categoría existe
    const existeQuery = `SELECT id_categoria, nombre FROM categorias WHERE id_categoria = $1`;
    const existeResult = await pool.query(existeQuery, [id]);

    if (existeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    // Verificar si la categoría está en uso
    const enUsoQuery = `
      SELECT 
        (SELECT COUNT(*) FROM talleres WHERE id_categoria = $1) as talleres_count,
        (SELECT COUNT(*) FROM competencias WHERE id_categoria = $1) as competencias_count,
        (SELECT COUNT(*) FROM foros WHERE id_categoria = $1) as foros_count
    `;
    const enUsoResult = await pool.query(enUsoQuery, [id]);
    const { talleres_count, competencias_count, foros_count } = enUsoResult.rows[0];

    const totalUsos = parseInt(talleres_count) + parseInt(competencias_count) + parseInt(foros_count);

    if (totalUsos > 0) {
      return res.status(409).json({
        success: false,
        message: `No se puede eliminar la categoría porque está siendo utilizada por ${talleres_count} taller(es), ${competencias_count} competencia(s) y ${foros_count} foro(s)`
      });
    }

    // Eliminar la categoría
    const eliminarQuery = `
      DELETE FROM categorias
      WHERE id_categoria = $1
      RETURNING id_categoria, nombre
    `;
    await pool.query(eliminarQuery, [id]);

    const response: EliminarCategoriaResponse = {
      success: true,
      message: 'Categoría eliminada exitosamente'
    };

    res.json(response);
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;