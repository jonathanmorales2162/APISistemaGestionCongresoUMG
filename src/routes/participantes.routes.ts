import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import pool from '../db/pool.js';
import { 
  crearParticipanteSchema, 
  actualizarParticipanteSchema, 
  filtrosParticipantesSchema,
  idParticipanteSchema
} from '../schemas/participantes.schema.js';
import type { 
  ParticipanteConRol, 
  ParticipanteSinPassword, 
  ApiResponse,
  RespuestaPaginada
} from '../types/participantes.types.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission, requireAnyPermission } from '../middleware/authorization.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Participantes
 *   description: Gestión de participantes del congreso
 */

/**
 * @swagger
 * /participantes:
 *   post:
 *     summary: Registrar nuevo participante
 *     description: Crea un nuevo participante en el sistema con rol de participante
 *     tags: [Participantes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - correo
 *               - tipo
 *               - password
 *               - id_rol
 *             properties:
 *               nombre:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Ana"
 *               apellido:
 *                 type: string
 *                 maxLength: 100
 *                 example: "López"
 *               correo:
 *                 type: string
 *                 format: email
 *                 maxLength: 150
 *                 example: "ana.lopez@email.com"
 *               telefono:
 *                 type: string
 *                 maxLength: 20
 *                 example: "+502 9876-1234"
 *               colegio:
 *                 type: string
 *                 maxLength: 150
 *                 example: "Liceo Nacional"
 *               tipo:
 *                 type: string
 *                 enum: [I, E]
 *                 example: "E"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 255
 *                 example: "AnaSegura2024*"
 *               id_rol:
 *                 type: integer
 *                 example: 4
 *     responses:
 *       201:
 *         description: Participante creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Usuario'
 *                 message:
 *                   type: string
 *                   example: "Participante registrado exitosamente"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const participanteData = crearParticipanteSchema.parse(req.body);

    // Verificar que el rol sea de participante (id_rol = 4)
    const roleQuery = await pool.query(
      'SELECT id_rol, nombre FROM roles WHERE id_rol = $1 AND nombre = $2',
      [participanteData.id_rol, 'Participante']
    );

    if (roleQuery.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El rol especificado no corresponde a un participante'
      });
    }

    // Verificar si el correo ya existe
    const existingUser = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = $1',
      [participanteData.correo]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado'
      });
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(participanteData.password, saltRounds);

    // Insertar el nuevo participante
    const insertQuery = `
      INSERT INTO usuarios (
        nombre, apellido, correo, telefono, colegio, tipo, password_hash, id_rol
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_usuario, nombre, apellido, correo, telefono, colegio, tipo, id_rol, creado_en
    `;

    const values = [
      participanteData.nombre,
      participanteData.apellido,
      participanteData.correo,
      participanteData.telefono || null,
      participanteData.colegio || null,
      participanteData.tipo,
      passwordHash,
      participanteData.id_rol
    ];

    const result = await pool.query(insertQuery, values);
    const newParticipante = result.rows[0];

    const participanteWithRole: ParticipanteConRol = {
      ...newParticipante,
      rol: {
        id_rol: newParticipante.id_rol,
        nombre: roleQuery.rows[0].nombre
      }
    };

    const response: ApiResponse<ParticipanteConRol> = {
      success: true,
      data: participanteWithRole,
      message: 'Participante registrado exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /participantes:
 *   get:
 *     summary: Listar participantes con filtros y paginación
 *     description: Obtiene una lista paginada de participantes con filtros opcionales
 *     tags: [Participantes]
 *     parameters:
 *       - in: query
 *         name: nombre
 *         schema:
 *           type: string
 *         description: Filtrar por nombre (búsqueda parcial)
 *       - in: query
 *         name: apellido
 *         schema:
 *           type: string
 *         description: Filtrar por apellido (búsqueda parcial)
 *       - in: query
 *         name: correo
 *         schema:
 *           type: string
 *         description: Filtrar por correo electrónico (búsqueda parcial)
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [I, E]
 *         description: Filtrar por tipo de participante (I = Interno, E = Externo)
 *       - in: query
 *         name: colegio
 *         schema:
 *           type: string
 *         description: Filtrar por colegio (búsqueda parcial)
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
 *         description: Cantidad de participantes por página
 *     responses:
 *       200:
 *         description: Lista de participantes obtenida exitosamente
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
 *                     $ref: '#/components/schemas/Usuario'
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
 *                       example: 45
 *                     limite:
 *                       type: integer
 *                       example: 10
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros = filtrosParticipantesSchema.parse(req.query);
    
    // Construir la consulta base para participantes (rol = 4)
    let whereConditions = ['u.id_rol = 4']; // Solo participantes
    let queryParams: any[] = [];
    let paramIndex = 1;

    // Agregar filtros dinámicos
    if (filtros.nombre) {
      whereConditions.push(`u.nombre ILIKE $${paramIndex}`);
      queryParams.push(`%${filtros.nombre}%`);
      paramIndex++;
    }

    if (filtros.apellido) {
      whereConditions.push(`u.apellido ILIKE $${paramIndex}`);
      queryParams.push(`%${filtros.apellido}%`);
      paramIndex++;
    }

    if (filtros.correo) {
      whereConditions.push(`u.correo ILIKE $${paramIndex}`);
      queryParams.push(`%${filtros.correo}%`);
      paramIndex++;
    }

    if (filtros.tipo) {
      whereConditions.push(`u.tipo = $${paramIndex}`);
      queryParams.push(filtros.tipo);
      paramIndex++;
    }

    if (filtros.colegio) {
      whereConditions.push(`u.colegio ILIKE $${paramIndex}`);
      queryParams.push(`%${filtros.colegio}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Consulta para contar el total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM usuarios u
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRegistros = parseInt(countResult.rows[0].total);

    // Calcular paginación
    const limite = filtros.limite;
    const pagina = filtros.pagina;
    const offset = (pagina - 1) * limite;
    const totalPaginas = Math.ceil(totalRegistros / limite);

    // Consulta principal con paginación
    const mainQuery = `
      SELECT 
        u.id_usuario, u.nombre, u.apellido, u.correo, u.telefono, 
        u.colegio, u.tipo, u.id_rol, u.creado_en,
        r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id_rol
      WHERE ${whereClause}
      ORDER BY u.creado_en DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limite, offset);
    const result = await pool.query(mainQuery, queryParams);

    // Formatear los resultados
    const participantes: ParticipanteConRol[] = result.rows.map(row => ({
      id_usuario: row.id_usuario,
      nombre: row.nombre,
      apellido: row.apellido,
      correo: row.correo,
      telefono: row.telefono,
      colegio: row.colegio,
      tipo: row.tipo,
      rol: {
        id_rol: row.id_rol,
        nombre: row.rol_nombre
      },
      creado_en: row.creado_en
    }));

    const response: RespuestaPaginada<ParticipanteConRol> = {
      success: true,
      data: participantes,
      pagination: {
        pagina_actual: pagina,
        total_paginas: totalPaginas,
        total_registros: totalRegistros,
        limite: limite
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /participantes/{id}:
 *   get:
 *     summary: Obtener detalle del participante
 *     description: Obtiene la información detallada de un participante específico
 *     tags: [Participantes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del participante
 *     responses:
 *       200:
 *         description: Información del participante obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Usuario'
 *                 message:
 *                   type: string
 *                   example: "Participante encontrado"
 *       404:
 *         description: Participante no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Participante no encontrado"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParticipanteSchema.parse(req.params);

    const query = `
      SELECT 
        u.id_usuario, u.nombre, u.apellido, u.correo, u.telefono, 
        u.colegio, u.tipo, u.id_rol, u.creado_en,
        r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = $1 AND u.id_rol = 4
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Participante no encontrado'
      });
    }

    const row = result.rows[0];
    const participante: ParticipanteConRol = {
      id_usuario: row.id_usuario,
      nombre: row.nombre,
      apellido: row.apellido,
      correo: row.correo,
      telefono: row.telefono,
      colegio: row.colegio,
      tipo: row.tipo,
      rol: {
        id_rol: row.id_rol,
        nombre: row.rol_nombre
      },
      creado_en: row.creado_en
    };

    const response: ApiResponse<ParticipanteConRol> = {
      success: true,
      data: participante,
      message: 'Participante encontrado'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /participantes/{id}:
 *   put:
 *     summary: Editar información del participante
 *     description: Actualiza la información de un participante específico
 *     tags: [Participantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del participante
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Ana María"
 *               apellido:
 *                 type: string
 *                 maxLength: 100
 *                 example: "López García"
 *               telefono:
 *                 type: string
 *                 maxLength: 20
 *                 example: "+502 9876-1234"
 *               colegio:
 *                 type: string
 *                 maxLength: 150
 *                 example: "Universidad Mariano Gálvez"
 *               tipo:
 *                 type: string
 *                 enum: [I, E]
 *                 example: "I"
 *     responses:
 *       200:
 *         description: Participante actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Usuario'
 *                 message:
 *                   type: string
 *                   example: "Participante actualizado exitosamente"
 *       404:
 *         description: Participante no encontrado
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/:id', authenticateToken, requireAnyPermission(['usuarios:update_self', 'usuarios:update']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParticipanteSchema.parse(req.params);
    const updateData = actualizarParticipanteSchema.parse(req.body);

    // Verificar que el participante existe
    const existingParticipante = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = $1 AND id_rol = 4',
      [id]
    );

    if (existingParticipante.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Participante no encontrado'
      });
    }

    // Construir la consulta de actualización dinámicamente
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updateData.nombre !== undefined) {
      updateFields.push(`nombre = $${paramIndex}`);
      updateValues.push(updateData.nombre);
      paramIndex++;
    }

    if (updateData.apellido !== undefined) {
      updateFields.push(`apellido = $${paramIndex}`);
      updateValues.push(updateData.apellido);
      paramIndex++;
    }

    if (updateData.telefono !== undefined) {
      updateFields.push(`telefono = $${paramIndex}`);
      updateValues.push(updateData.telefono);
      paramIndex++;
    }

    if (updateData.colegio !== undefined) {
      updateFields.push(`colegio = $${paramIndex}`);
      updateValues.push(updateData.colegio);
      paramIndex++;
    }

    if (updateData.tipo !== undefined) {
      updateFields.push(`tipo = $${paramIndex}`);
      updateValues.push(updateData.tipo);
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
      UPDATE usuarios 
      SET ${updateFields.join(', ')}
      WHERE id_usuario = $${paramIndex} AND id_rol = 4
      RETURNING id_usuario, nombre, apellido, correo, telefono, colegio, tipo, id_rol, creado_en
    `;

    const result = await pool.query(updateQuery, updateValues);

    // Obtener el nombre del rol
    const roleQuery = await pool.query(
      'SELECT nombre FROM roles WHERE id_rol = 4'
    );

    const participanteActualizado: ParticipanteConRol = {
      ...result.rows[0],
      rol: {
        id_rol: result.rows[0].id_rol,
        nombre: roleQuery.rows[0].nombre
      }
    };

    const response: ApiResponse<ParticipanteConRol> = {
      success: true,
      data: participanteActualizado,
      message: 'Participante actualizado exitosamente'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /participantes/{id}:
 *   delete:
 *     summary: Eliminar participante (solo admin)
 *     description: Elimina un participante del sistema. Solo usuarios con rol de administrador pueden realizar esta acción.
 *     tags: [Participantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del participante a eliminar
 *     responses:
 *       200:
 *         description: Participante eliminado exitosamente
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
 *                   example: "Participante eliminado exitosamente"
 *       404:
 *         description: Participante no encontrado
 *       403:
 *         description: Acceso denegado - Solo administradores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Acceso denegado. Solo administradores pueden eliminar participantes"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/:id', authenticateToken, requirePermission('usuarios:delete'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idParticipanteSchema.parse(req.params);

    // Verificar que el usuario autenticado sea administrador
    const userRoleQuery = await pool.query(
      'SELECT r.nombre FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = $1',
      [req.user!.id]
    );

    if (userRoleQuery.rows.length === 0 || userRoleQuery.rows[0].nombre !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden eliminar participantes'
      });
    }

    // Verificar que el participante existe
    const existingParticipante = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = $1 AND id_rol = 4',
      [id]
    );

    if (existingParticipante.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Participante no encontrado'
      });
    }

    // Eliminar el participante
    await pool.query(
      'DELETE FROM usuarios WHERE id_usuario = $1 AND id_rol = 4',
      [id]
    );

    const response: ApiResponse<null> = {
      success: true,
      message: 'Participante eliminado exitosamente'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;