import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../middleware/authorization.middleware.js';
import { 
  crearForoSchema, 
  actualizarForoSchema, 
  filtrosForosSchema, 
  idForoSchema,
  cambiarEstadoSchema 
} from '../schemas/foros.schema.js';
import { 
  CrearForoRequest, 
  ActualizarForoRequest, 
  FiltrosForos, 
  ForoIdParams,
  CambiarEstadoRequest,
  Foro,
  ApiResponse,
  RespuestaPaginada 
} from '../types/foros.types.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Categoria:
 *       type: object
 *       properties:
 *         id_categoria:
 *           type: integer
 *           description: ID único de la categoría
 *           example: 3
 *         nombre:
 *           type: string
 *           description: Nombre de la categoría
 *           example: "Ciberseguridad"
 *       required:
 *         - id_categoria
 *         - nombre
 *
 *     Foro:
 *       type: object
 *       properties:
 *         id_foro:
 *           type: integer
 *           description: ID único del foro
 *           example: 1
 *         titulo:
 *           type: string
 *           description: Título del foro
 *           example: "Charla de Ciberseguridad"
 *         descripcion:
 *           type: string
 *           description: Descripción detallada del foro
 *           example: "Discusión sobre buenas prácticas de seguridad en redes."
 *         fecha_creacion:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación del foro
 *           example: "2025-11-15T10:30:00Z"
 *         fecha_actualizacion:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización del foro
 *           example: "2025-11-15T14:20:00Z"
 *         id_categoria:
 *           type: integer
 *           description: ID de la categoría del foro
 *           example: 3
 *         categoria:
 *           $ref: '#/components/schemas/Categoria'
 *           description: Información completa de la categoría
 *         estado:
 *           type: string
 *           enum: [A, I]
 *           description: Estado del foro (A=Activo, I=Inactivo)
 *           example: "A"
 *         id_usuario:
 *           type: integer
 *           description: ID del usuario creador del foro
 *           example: 1
 *       required:
 *         - id_foro
 *         - titulo
 *         - descripcion
 *         - fecha_creacion
 *         - fecha_actualizacion
 *         - id_categoria
 *         - estado
 *         - id_usuario
 *
 *     CrearForoRequest:
 *       type: object
 *       properties:
 *         titulo:
 *           type: string
 *           description: Título del foro
 *           example: "Charla de Ciberseguridad"
 *         descripcion:
 *           type: string
 *           description: Descripción del foro
 *           example: "Discusión sobre buenas prácticas de seguridad en redes."
 *         id_categoria:
 *           type: integer
 *           description: ID de la categoría
 *           example: 3
 *         estado:
 *           type: string
 *           enum: [A, I]
 *           description: Estado del foro (opcional, por defecto 'A'=Activo)
 *           example: "A"
 *       required:
 *         - titulo
 *         - descripcion
 *         - id_categoria
 *
 *     ActualizarForoRequest:
 *       type: object
 *       properties:
 *         titulo:
 *           type: string
 *           description: Título del foro
 *           example: "Charla de Ciberseguridad Actualizada"
 *         descripcion:
 *           type: string
 *           description: Descripción del foro
 *           example: "Discusión actualizada sobre buenas prácticas de seguridad."
 *         id_categoria:
 *           type: integer
 *           description: ID de la categoría
 *           example: 4
 *         estado:
 *           type: string
 *           enum: [A, I]
 *           description: Estado del foro (A=Activo, I=Inactivo)
 *           example: "I"
 *
 *     CambiarEstadoRequest:
 *       type: object
 *       properties:
 *         estado:
 *           type: string
 *           enum: [A, I]
 *           description: Nuevo estado del foro (A=Activo, I=Inactivo)
 *           example: "I"
 *       required:
 *         - estado
 *
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indica si la operación fue exitosa
 *           example: true
 *         message:
 *           type: string
 *           description: Mensaje descriptivo de la operación
 *           example: "Foro creado exitosamente"
 *         data:
 *           description: Datos de respuesta (puede ser cualquier tipo)
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 description: Campo que contiene el error
 *               message:
 *                 type: string
 *                 description: Mensaje de error
 *           description: Lista de errores de validación
 *
 *     RespuestaPaginada:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indica si la operación fue exitosa
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Foro'
 *           description: Lista de foros
 *         pagination:
 *           type: object
 *           properties:
 *             pagina_actual:
 *               type: integer
 *               description: Página actual
 *               example: 1
 *             total_paginas:
 *               type: integer
 *               description: Total de páginas
 *               example: 5
 *             total_registros:
 *               type: integer
 *               description: Total de registros
 *               example: 50
 *             limite:
 *               type: integer
 *               description: Límite de registros por página
 *               example: 10
 *
 *   tags:
 *     - name: Foros
 *       description: Operaciones relacionadas con la gestión de foros del congreso
 */

/**
 * @swagger
 * /api/foros:
 *   post:
 *     summary: Crear un nuevo foro
 *     description: Crea un nuevo foro en el sistema. Requiere autenticación JWT con rol de administrador u organizador.
 *     tags: [Foros]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearForoRequest'
 *           example:
 *             titulo: "Charla de Ciberseguridad"
 *             descripcion: "Discusión sobre buenas prácticas de seguridad en redes."
 *             id_categoria: 3
 *             estado: "A"
 *     responses:
 *       201:
 *         description: Foro creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "Foro creado exitosamente"
 *               data:
 *                 id_foro: 12
 *                 titulo: "Charla de Ciberseguridad"
 *                 descripcion: "Discusión sobre buenas prácticas de seguridad en redes."
 *                 fecha_creacion: "2025-11-15T10:30:00Z"
 *                 fecha_actualizacion: "2025-11-15T10:30:00Z"
 *                 id_categoria: 3
 *                 categoria:
 *                   id_categoria: 3
 *                   nombre: "Ciberseguridad"
 *                 estado: "A"
 *                 id_usuario: 1
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: false
 *               message: "Error de validación"
 *               errors:
 *                 - field: "titulo"
 *                   message: "El título no puede estar vacío"
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', authenticateToken, requirePermission('foros:create'), async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar datos de entrada
    const datosValidados = crearForoSchema.parse(req.body) as CrearForoRequest;

    // Verificar que la categoría existe
    const categoriaQuery = 'SELECT id_categoria, nombre FROM categorias WHERE id_categoria = $1';
    const categoriaResult = await pool.query(categoriaQuery, [datosValidados.id_categoria]);
    
    if (categoriaResult.rows.length === 0) {
      res.status(400).json({
        success: false,
        message: 'La categoría especificada no existe.'
      } as ApiResponse<null>);
      return;
    }

    // Insertar el nuevo foro
    const insertQuery = `
      INSERT INTO foros (titulo, descripcion, id_categoria, estado, id_usuario)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_foro, titulo, descripcion, fecha_creacion, fecha_actualizacion, id_categoria, estado, id_usuario
    `;

    const insertResult = await pool.query(insertQuery, [
      datosValidados.titulo,
      datosValidados.descripcion,
      datosValidados.id_categoria,
      datosValidados.estado,
      (req as any).user?.id // ID del usuario autenticado
    ]);

    const nuevoForo = insertResult.rows[0];
    const categoria = categoriaResult.rows[0];

    // Formatear la respuesta
    const foroCreado: Foro = {
      id_foro: nuevoForo.id_foro,
      titulo: nuevoForo.titulo,
      descripcion: nuevoForo.descripcion,
      fecha_creacion: nuevoForo.fecha_creacion.toISOString(),
      fecha_actualizacion: nuevoForo.fecha_actualizacion.toISOString(),
      id_categoria: nuevoForo.id_categoria,
      categoria: {
        id_categoria: categoria.id_categoria,
        nombre: categoria.nombre
      },
      estado: nuevoForo.estado,
      id_usuario: nuevoForo.id_usuario
    };

    res.status(201).json({
      success: true,
      message: 'Foro creado exitosamente',
      data: foroCreado
    } as ApiResponse<Foro>);

  } catch (error) {
    console.error('Error al crear foro:', error);

    if (error instanceof z.ZodError) {
      const errores = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errores
      } as ApiResponse<null>);
      return;
    }

    res.status(500).json({
       success: false,
       message: 'Error interno del servidor'
     } as ApiResponse<null>);
   }
 });

/**
 * @swagger
 * /api/foros/{id}:
 *   put:
 *     summary: Actualizar un foro completo
 *     description: Actualiza todos los campos de un foro existente. Requiere autenticación JWT con rol de administrador u organizador.
 *     tags: [Foros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID único del foro
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarForoRequest'
 *           example:
 *             titulo: "Charla de Ciberseguridad Actualizada"
 *             descripcion: "Discusión actualizada sobre buenas prácticas de seguridad."
 *             id_categoria: 4
 *             estado: "A"
 *     responses:
 *       200:
 *         description: Foro actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "Foro actualizado exitosamente"
 *               data:
 *                 id_foro: 1
 *                 titulo: "Charla de Ciberseguridad Actualizada"
 *                 descripcion: "Discusión actualizada sobre buenas prácticas de seguridad."
 *                 fecha_creacion: "2025-11-15T10:30:00Z"
 *                 fecha_actualizacion: "2025-11-16T14:20:00Z"
 *                 id_categoria: 4
 *                 categoria:
 *                   id_categoria: 4
 *                   nombre: "Tecnología"
 *                 estado: "A"
 *                 id_usuario: 1
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Foro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', authenticateToken, requirePermission('foros:update'), async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar parámetros y datos
    const { id } = idForoSchema.parse(req.params) as unknown as ForoIdParams;
    const datosValidados = actualizarForoSchema.parse(req.body) as ActualizarForoRequest;

    // Verificar que el foro existe
    const foroExistente = await pool.query('SELECT id_foro FROM foros WHERE id_foro = $1', [id]);
    if (foroExistente.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Foro no encontrado'
      } as ApiResponse<null>);
      return;
    }

    // Verificar que la categoría existe si se proporciona
    if (datosValidados.id_categoria) {
      const categoriaQuery = 'SELECT id_categoria FROM categorias WHERE id_categoria = $1';
      const categoriaResult = await pool.query(categoriaQuery, [datosValidados.id_categoria]);
      
      if (categoriaResult.rows.length === 0) {
        res.status(400).json({
          success: false,
          message: 'La categoría especificada no existe.'
        } as ApiResponse<null>);
        return;
      }
    }

    // Construir la consulta de actualización dinámicamente
    const camposActualizar: string[] = [];
    const valoresActualizar: any[] = [];
    let paramIndex = 1;

    if (datosValidados.titulo !== undefined) {
      camposActualizar.push(`titulo = $${paramIndex}`);
      valoresActualizar.push(datosValidados.titulo);
      paramIndex++;
    }

    if (datosValidados.descripcion !== undefined) {
      camposActualizar.push(`descripcion = $${paramIndex}`);
      valoresActualizar.push(datosValidados.descripcion);
      paramIndex++;
    }



    if (datosValidados.id_categoria !== undefined) {
      camposActualizar.push(`id_categoria = $${paramIndex}`);
      valoresActualizar.push(datosValidados.id_categoria);
      paramIndex++;
    }

    if (datosValidados.estado !== undefined) {
      camposActualizar.push(`estado = $${paramIndex}`);
      valoresActualizar.push(datosValidados.estado);
      paramIndex++;
    }

    if (camposActualizar.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar'
      } as ApiResponse<null>);
      return;
    }

    // Agregar el ID del foro al final
    valoresActualizar.push(id);

    // Ejecutar la actualización
    const updateQuery = `
      UPDATE foros 
      SET ${camposActualizar.join(', ')}, fecha_actualizacion = NOW()
      WHERE id_foro = $${paramIndex}
      RETURNING id_foro, titulo, descripcion, fecha_creacion, fecha_actualizacion, id_categoria, estado, id_usuario
    `;

    const updateResult = await pool.query(updateQuery, valoresActualizar);

    // Obtener la información de la categoría
    const foroActualizado = updateResult.rows[0];
    const categoriaQuery = 'SELECT id_categoria, nombre FROM categorias WHERE id_categoria = $1';
    const categoriaResult = await pool.query(categoriaQuery, [foroActualizado.id_categoria]);

    const foro: Foro = {
      id_foro: foroActualizado.id_foro,
      titulo: foroActualizado.titulo,
      descripcion: foroActualizado.descripcion,
      fecha_creacion: foroActualizado.fecha_creacion.toISOString(),
      fecha_actualizacion: foroActualizado.fecha_actualizacion.toISOString(),
      id_categoria: foroActualizado.id_categoria,
      categoria: categoriaResult.rows[0] ? {
        id_categoria: categoriaResult.rows[0].id_categoria,
        nombre: categoriaResult.rows[0].nombre
      } : undefined,
      estado: foroActualizado.estado,
      id_usuario: foroActualizado.id_usuario
    };

    res.status(200).json({
      success: true,
      message: 'Foro actualizado exitosamente',
      data: foro
    } as ApiResponse<Foro>);

  } catch (error) {
    console.error('Error al actualizar foro:', error);

    if (error instanceof z.ZodError) {
      const errores = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errores
      } as ApiResponse<null>);
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    } as ApiResponse<null>);
  }
 });

/**
 * @swagger
 * /api/foros/{id}/estado:
 *   patch:
 *     summary: Cambiar estado de un foro
 *     description: Cambia el estado de un foro entre activo e inactivo. Requiere autenticación JWT con rol de administrador u organizador.
 *     tags: [Foros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID único del foro
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CambiarEstadoRequest'
 *           example:
 *             estado: "I"
 *     responses:
 *       200:
 *         description: Estado del foro actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "Estado del foro actualizado correctamente"
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Foro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/:id/estado', authenticateToken, requirePermission('foros:update'), async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar parámetros y datos
    const { id } = idForoSchema.parse(req.params) as unknown as ForoIdParams;
    const { estado } = cambiarEstadoSchema.parse(req.body) as CambiarEstadoRequest;

    // Verificar que el foro existe
    const foroExistente = await pool.query('SELECT id_foro FROM foros WHERE id_foro = $1', [id]);
    if (foroExistente.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Foro no encontrado'
      } as ApiResponse<null>);
      return;
    }

    // Actualizar solo el estado
    const updateQuery = 'UPDATE foros SET estado = $1 WHERE id_foro = $2';
    await pool.query(updateQuery, [estado, id]);

    res.status(200).json({
      success: true,
      message: 'Estado del foro actualizado correctamente'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Error al cambiar estado del foro:', error);

    if (error instanceof z.ZodError) {
      const errores = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errores
      } as ApiResponse<null>);
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    } as ApiResponse<null>);
  }
});

/**
 * @swagger
 * /api/foros/{id}:
 *   delete:
 *     summary: Eliminar un foro
 *     description: Elimina permanentemente un foro del sistema. Solo accesible para administradores.
 *     tags: [Foros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID único del foro a eliminar
 *         example: 1
 *     responses:
 *       200:
 *         description: Foro eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "Foro eliminado exitosamente"
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado - Solo administradores
 *       404:
 *         description: Foro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', authenticateToken, requirePermission('foros:delete'), async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar parámetros
    const { id } = idForoSchema.parse(req.params) as unknown as ForoIdParams;

    // Verificar que el foro existe
    const foroExistente = await pool.query('SELECT id_foro FROM foros WHERE id_foro = $1', [id]);
    if (foroExistente.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Foro no encontrado'
      } as ApiResponse<null>);
      return;
    }

    // Eliminar el foro
    await pool.query('DELETE FROM foros WHERE id_foro = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Foro eliminado exitosamente'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Error al eliminar foro:', error);

    if (error instanceof z.ZodError) {
      const errores = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errores
      } as ApiResponse<null>);
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    } as ApiResponse<null>);
  }
});

/**
 * @swagger
 * /api/foros/{id}:
 *   get:
 *     summary: Obtener detalle de un foro por ID
 *     description: Obtiene la información detallada de un foro específico. Endpoint público.
 *     tags: [Foros]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID único del foro
 *         example: 1
 *     responses:
 *       200:
 *         description: Foro encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 id_foro: 1
 *                 titulo: "Charla de Ciberseguridad"
 *                 descripcion: "Discusión sobre buenas prácticas de seguridad en redes."
 *                 fecha_creacion: "2025-11-15T10:30:00Z"
 *                 fecha_actualizacion: "2025-11-15T10:30:00Z"
 *                 id_categoria: 3
 *                 categoria:
 *                   id_categoria: 3
 *                   nombre: "Ciberseguridad"
 *                 estado: "A"
 *                 id_usuario: 1
 *       400:
 *         description: ID de foro inválido
 *       404:
 *         description: Foro no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar parámetros
    const { id } = idForoSchema.parse(req.params) as unknown as ForoIdParams;

    // Consultar el foro por ID
    const query = `
      SELECT 
        f.id_foro,
        f.titulo,
        f.descripcion,
        f.fecha_creacion,
        f.fecha_actualizacion,
        f.id_categoria,
        c.id_categoria as categoria_id,
        c.nombre as categoria_nombre,
        f.estado,
        f.id_usuario
      FROM foros f
      LEFT JOIN categorias c ON f.id_categoria = c.id_categoria
      WHERE f.id_foro = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Foro no encontrado'
      } as ApiResponse<null>);
      return;
    }

    const row = result.rows[0];
    const foro: Foro = {
      id_foro: row.id_foro,
      titulo: row.titulo,
      descripcion: row.descripcion,
      fecha_creacion: row.fecha_creacion.toISOString(),
      fecha_actualizacion: row.fecha_actualizacion.toISOString(),
      id_categoria: row.id_categoria,
      categoria: row.categoria_nombre ? {
        id_categoria: row.categoria_id,
        nombre: row.categoria_nombre
      } : undefined,
      estado: row.estado,
      id_usuario: row.id_usuario
    };

    res.status(200).json({
      success: true,
      data: foro
    } as ApiResponse<Foro>);

  } catch (error) {
    console.error('Error al obtener foro:', error);

    if (error instanceof z.ZodError) {
      const errores = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      res.status(400).json({
        success: false,
        message: 'ID de foro inválido',
        errors: errores
      } as ApiResponse<null>);
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    } as ApiResponse<null>);
  }
});

/**
 * @swagger
 * /api/foros:
 *   get:
 *     summary: Listar foros con filtros y paginación
 *     description: Obtiene una lista paginada de foros con filtros opcionales. Endpoint público.
 *     tags: [Foros]
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [A, I]
 *         description: Filtrar por estado del foro (A=Activo, I=Inactivo)
 *         example: "A"
 *       - in: query
 *         name: categoria
 *         schema:
 *           type: string
 *         description: Filtrar por nombre de categoría
 *         example: "Tecnología"
 *       - in: query
 *         name: fecha_creacion
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar foros por fecha de creación
 *         example: "2025-11-01"
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *         example: 1
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Número de registros por página
 *         example: 10
 *     responses:
 *       200:
 *         description: Lista de foros obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RespuestaPaginada'
 *             example:
 *               success: true
 *               data:
 *                 - id_foro: 1
 *                   titulo: "Introducción a la IA"
 *                   descripcion: "Charla introductoria al uso ético de la inteligencia artificial"
 *                   fecha_creacion: "2025-11-01T09:00:00Z"
 *                   fecha_actualizacion: "2025-11-01T09:00:00Z"
 *                   id_categoria: 1
 *                   categoria:
 *                     id_categoria: 1
 *                     nombre: "Tecnología"
 *                   estado: "A"
 *                   id_usuario: 1
 *                 - id_foro: 2
 *                   titulo: "Blockchain en la industria"
 *                   descripcion: "Aplicaciones prácticas de blockchain más allá de las criptomonedas"
 *                   fecha_creacion: "2025-11-03T14:30:00Z"
 *                   fecha_actualizacion: "2025-11-03T14:30:00Z"
 *                   id_categoria: 2
 *                   categoria:
 *                     id_categoria: 2
 *                     nombre: "Innovación"
 *                   estado: "I"
 *                   id_usuario: 2
 *               pagination:
 *                 pagina_actual: 1
 *                 total_paginas: 5
 *                 total_registros: 50
 *                 limite: 10
 *       400:
 *         description: Error de validación en los parámetros
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validar parámetros de consulta
    const filtrosValidados = filtrosForosSchema.parse(req.query) as FiltrosForos;

    // Construir la consulta base
    let baseQuery = `
      SELECT 
        f.id_foro,
        f.titulo,
        f.descripcion,
        f.fecha_creacion,
        f.fecha_actualizacion,
        f.id_categoria,
        c.id_categoria as categoria_id,
        c.nombre as categoria_nombre,
        f.estado,
        f.id_usuario
      FROM foros f
      LEFT JOIN categorias c ON f.id_categoria = c.id_categoria
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM foros f
      LEFT JOIN categorias c ON f.id_categoria = c.id_categoria
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Aplicar filtros
    if (filtrosValidados.estado) {
      baseQuery += ` AND f.estado = $${paramIndex}`;
      countQuery += ` AND f.estado = $${paramIndex}`;
      queryParams.push(filtrosValidados.estado);
      paramIndex++;
    }

    if (filtrosValidados.categoria) {
      baseQuery += ` AND LOWER(c.nombre) LIKE LOWER($${paramIndex})`;
      countQuery += ` AND LOWER(c.nombre) LIKE LOWER($${paramIndex})`;
      queryParams.push(`%${filtrosValidados.categoria}%`);
      paramIndex++;
    }

    if (filtrosValidados.fecha_creacion) {
      baseQuery += ` AND DATE(f.fecha_creacion) = $${paramIndex}`;
      countQuery += ` AND DATE(f.fecha_creacion) = $${paramIndex}`;
      queryParams.push(filtrosValidados.fecha_creacion);
      paramIndex++;
    }

    // Obtener el total de registros
    const countResult = await pool.query(countQuery, queryParams);
    const totalRegistros = parseInt(countResult.rows[0].total);

    // Calcular paginación
    const limite = filtrosValidados.limite || 10;
    const pagina = filtrosValidados.pagina || 1;
    const offset = (pagina - 1) * limite;
    const totalPaginas = Math.ceil(totalRegistros / limite);

    // Agregar ordenamiento y paginación
    baseQuery += ` ORDER BY f.fecha_creacion DESC`;
    baseQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limite, offset);

    // Ejecutar consulta principal
    const result = await pool.query(baseQuery, queryParams);

    // Formatear los resultados
    const foros: Foro[] = result.rows.map(row => ({
      id_foro: row.id_foro,
      titulo: row.titulo,
      descripcion: row.descripcion,
      fecha_creacion: row.fecha_creacion.toISOString(),
      fecha_actualizacion: row.fecha_actualizacion.toISOString(),
      id_categoria: row.id_categoria,
      categoria: row.categoria_nombre ? {
        id_categoria: row.categoria_id,
        nombre: row.categoria_nombre
      } : undefined,
      estado: row.estado,
      id_usuario: row.id_usuario
    }));

    res.status(200).json({
      success: true,
      data: foros,
      pagination: {
        pagina_actual: pagina,
        total_paginas: totalPaginas,
        total_registros: totalRegistros,
        limite: limite
      }
    } as RespuestaPaginada<Foro>);

  } catch (error) {
    console.error('Error al obtener foros:', error);

    if (error instanceof z.ZodError) {
      const errores = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      res.status(400).json({
        success: false,
        message: 'Error de validación en los parámetros',
        errors: errores
      } as ApiResponse<null>);
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    } as ApiResponse<null>);
  }
});

export default router;