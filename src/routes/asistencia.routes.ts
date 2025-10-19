import { Router, Request, Response } from 'express';
import pool from '../db/pool.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAnyPermission } from '../middleware/authorization.middleware.js';
import { 
  crearAsistenciaSchema, 
  actualizarAsistenciaSchema, 
  filtrosAsistenciaSchema,
  idAsistenciaSchema 
} from '../schemas/asistencia.schema.js';
import { 
  AsistenciaCompleta, 
  RespuestaAsistencia, 
  RespuestaListaAsistencia 
} from '../types/asistencia.types.js';

const router = Router();

// Función para mapear filas de la base de datos a AsistenciaCompleta
function mapRowToAsistenciaCompleta(row: any): AsistenciaCompleta {
  return {
    id_asistencia: row.id_asistencia,
    id_usuario: row.id_usuario,
    id_tipo: row.id_tipo,
    id_taller: row.id_taller,
    id_competencia: row.id_competencia,
    id_foro: row.id_foro,
    fecha: row.fecha,
    estado: row.estado || 'D', // Default si no existe en BD
    usuario: {
      id_usuario: row.usuario_id,
      nombre: row.usuario_nombre,
      apellido: row.usuario_apellido,
      correo: row.usuario_correo,
      foto_url: row.foto_url
    },
    tipo_evento: {
      id_tipo: row.tipo_id,
      nombre: row.tipo_nombre
    },
    taller: row.taller_id ? {
      id_taller: row.taller_id,
      titulo: row.taller_titulo,
      descripcion: row.taller_descripcion,
      horario: row.taller_horario,
      imagen_url: row.taller_imagen_url,
      anio_evento: row.taller_anio_evento
    } : null,
    competencia: row.competencia_id ? {
      id_competencia: row.competencia_id,
      titulo: row.competencia_titulo,
      descripcion: row.competencia_descripcion,
      horario: row.competencia_horario,
      imagen_url: row.competencia_imagen_url,
      anio_evento: row.competencia_anio_evento
    } : null,
    foro: row.foro_id ? {
      id_foro: row.foro_id,
      titulo: row.foro_titulo,
      descripcion: row.foro_descripcion,
      fecha_creacion: row.foro_fecha_creacion,
      imagen_url: row.foro_imagen_url
    } : null
  };
}

/**
 * @swagger
 * /api/asistencia:
 *   post:
 *     summary: Crear nueva asistencia
 *     tags: [Asistencia]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_usuario
 *             properties:
 *               id_usuario:
 *                 type: integer
 *                 description: ID del usuario
 *               id_taller:
 *                 type: integer
 *                 description: ID del taller (requerido si no se especifica id_competencia)
 *               id_competencia:
 *                 type: integer
 *                 description: ID de la competencia (requerido si no se especifica id_taller o id_foro)
 *               id_foro:
 *                 type: integer
 *                 description: ID del foro (requerido si no se especifica id_taller o id_competencia)
 *               estado:
 *                 type: string
 *                 enum: [P, A, D]
 *                 default: D
 *                 description: Estado de la asistencia (P=Presente, A=Ausente, D=Default)
 *     responses:
 *       201:
 *         description: Asistencia creada exitosamente
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
 *                   example: "Asistencia registrada exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_asistencia:
 *                       type: integer
 *                       description: ID único de la asistencia
 *                     id_usuario:
 *                       type: integer
 *                       description: ID del usuario
 *                     id_tipo:
 *                       type: integer
 *                       description: Tipo de evento (1=Taller, 2=Competencia)
 *                     id_taller:
 *                       type: integer
 *                       nullable: true
 *                       description: ID del taller (si aplica)
 *                     id_competencia:
 *                       type: integer
 *                       nullable: true
 *                       description: ID de la competencia (si aplica)
 *                     id_foro:
 *                       type: integer
 *                       nullable: true
 *                       description: ID del foro (si aplica)
 *                     fecha:
 *                       type: string
 *                       format: date-time
 *                       description: Fecha y hora de registro de asistencia
 *                     estado:
 *                       type: string
 *                       enum: [P, A, D]
 *                       description: Estado de la asistencia (P=Presente, A=Ausente, D=Default)
 *       400:
 *         description: Error de validación
 *       403:
 *         description: Sin permisos
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /api/asistencia:
 *   post:
 *     summary: Registrar asistencia a un evento
 *     tags: [Asistencia]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearAsistenciaRequest'
 *     responses:
 *       201:
 *         description: Asistencia registrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 asistencia:
 *                   $ref: '#/components/schemas/Asistencia'
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Sin permisos para registrar asistencia
 *       409:
 *         description: La asistencia ya está registrada
 */
router.post('/', authenticateToken, requireAnyPermission(['asistencia:create']), async (req: Request, res: Response) => {
  try {
    const validationResult = crearAsistenciaSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        errors: validationResult.error.issues
      });
    }

    const { id_usuario, id_taller, id_competencia, id_foro, estado } = validationResult.data;

    // Verificar que el usuario existe
    const usuarioQuery = 'SELECT id_usuario FROM usuarios WHERE id_usuario = $1';
    const usuarioResult = await pool.query(usuarioQuery, [id_usuario]);
    
    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El usuario no existe'
      });
    }

    // Determinar el tipo de evento y verificar que existe
    let id_tipo: number;
    let eventoExiste = false;

    if (id_taller) {
      const tallerQuery = 'SELECT id_taller FROM talleres WHERE id_taller = $1';
      const tallerResult = await pool.query(tallerQuery, [id_taller]);
      eventoExiste = tallerResult.rows.length > 0;
      id_tipo = 1; // Taller
    } else if (id_competencia) {
      const competenciaQuery = 'SELECT id_competencia FROM competencias WHERE id_competencia = $1';
      const competenciaResult = await pool.query(competenciaQuery, [id_competencia]);
      eventoExiste = competenciaResult.rows.length > 0;
      id_tipo = 2; // Competencia
    } else if (id_foro) {
      const foroQuery = 'SELECT id_foro FROM foros WHERE id_foro = $1';
      const foroResult = await pool.query(foroQuery, [id_foro]);
      eventoExiste = foroResult.rows.length > 0;
      id_tipo = 3; // Foro
    }

    if (!eventoExiste) {
      return res.status(404).json({
        success: false,
        message: 'El evento no existe'
      });
    }

    // Verificar que el usuario está inscrito en el evento
    const inscripcionQuery = `
      SELECT id_inscripcion 
      FROM inscripciones 
      WHERE id_usuario = $1 
        AND id_tipo = $2 
        AND ($3::bigint IS NULL OR id_taller = $3) 
        AND ($4::bigint IS NULL OR id_competencia = $4)
        AND ($5::bigint IS NULL OR id_foro = $5)
    `;
    const inscripcionResult = await pool.query(inscripcionQuery, [id_usuario, id_tipo!, id_taller || null, id_competencia || null, id_foro || null]);

    if (inscripcionResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El usuario debe estar inscrito en el evento para registrar asistencia'
      });
    }

    // Verificar que no existe ya una asistencia registrada
    const asistenciaExistenteQuery = `
      SELECT id_asistencia 
      FROM asistencia 
      WHERE id_usuario = $1 
        AND ($2::bigint IS NULL OR id_taller = $2) 
        AND ($3::bigint IS NULL OR id_competencia = $3)
        AND ($4::bigint IS NULL OR id_foro = $4)
    `;
    const asistenciaExistente = await pool.query(asistenciaExistenteQuery, [id_usuario, id_taller || null, id_competencia || null, id_foro || null]);

    if (asistenciaExistente.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'La asistencia ya está registrada para este evento'
      });
    }

    // Insertar la nueva asistencia
    const insertQuery = `
      INSERT INTO asistencia (id_usuario, id_tipo, id_taller, id_competencia, id_foro, fecha, estado)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
      RETURNING id_asistencia, fecha, estado
    `;
    const insertValues = [id_usuario, id_tipo!, id_taller || null, id_competencia || null, id_foro || null, estado];
    const insertResult = await pool.query(insertQuery, insertValues);

    // Obtener la asistencia completa recién creada
    const asistenciaCompleta = await obtenerAsistenciaPorId(insertResult.rows[0].id_asistencia);

    const response: RespuestaAsistencia = {
      success: true,
      message: 'Asistencia registrada exitosamente',
      asistencia: asistenciaCompleta
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('Error al registrar asistencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/asistencia:
 *   get:
 *     summary: Obtener lista de asistencias con filtros
 *     tags: [Asistencia]
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
 *         description: Filtrar por tipo de evento
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
 *         name: id_foro
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de foro
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [P, A, D]
 *         description: Filtrar por estado de asistencia (P=Presente, A=Ausente, D=Default)
 *       - in: query
 *         name: fecha_desde
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filtrar desde fecha
 *       - in: query
 *         name: fecha_hasta
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filtrar hasta fecha
 *       - in: query
 *         name: usuario
 *         schema:
 *           type: string
 *           enum: [me]
 *         description: Filtrar por usuario actual (solo para participantes)
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
 *         description: Elementos por página
 *     responses:
 *       200:
 *         description: Lista de asistencias obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 asistencias:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Asistencia'
 *                 total:
 *                   type: integer
 *                 pagina:
 *                   type: integer
 *                 limite:
 *                   type: integer
 *                 totalPaginas:
 *                   type: integer
 */
router.get('/', authenticateToken, requireAnyPermission(['asistencia:read', 'asistencia:read_self']), async (req: Request, res: Response) => {
  try {
    const validationResult = filtrosAsistenciaSchema.safeParse(req.query);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        errors: validationResult.error.issues
      });
    }

    const { 
      id_usuario, 
      id_tipo, 
      id_taller, 
      id_competencia, 
      id_foro,
      estado, 
      fecha_desde, 
      fecha_hasta, 
      usuario, 
      pagina, 
      limite 
    } = validationResult.data;

    // Si es un participante y usa "usuario=me", filtrar por su propio ID
    let filtroUsuario = id_usuario;
    if (usuario === 'me') {
      filtroUsuario = (req as any).user.id_usuario;
    }

    // Construir la consulta con filtros dinámicos
    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (filtroUsuario) {
      whereConditions.push(`a.id_usuario = $${paramIndex++}`);
      queryParams.push(filtroUsuario);
    }

    if (id_tipo) {
      whereConditions.push(`a.id_tipo = $${paramIndex++}`);
      queryParams.push(id_tipo);
    }

    if (id_taller) {
      whereConditions.push(`a.id_taller = $${paramIndex++}`);
      queryParams.push(id_taller);
    }

    if (id_competencia) {
      whereConditions.push(`a.id_competencia = $${paramIndex++}`);
      queryParams.push(id_competencia);
    }

    if (id_foro) {
      whereConditions.push(`a.id_foro = $${paramIndex++}`);
      queryParams.push(id_foro);
    }

    if (fecha_desde) {
      whereConditions.push(`a.fecha >= $${paramIndex++}`);
      queryParams.push(fecha_desde);
    }

    if (fecha_hasta) {
      whereConditions.push(`a.fecha <= $${paramIndex++}`);
      queryParams.push(fecha_hasta);
    }

    if (estado) {
      whereConditions.push(`a.estado = $${paramIndex++}`);
      queryParams.push(estado);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Consulta principal con paginación
    const offset = (pagina - 1) * limite;
    const query = `
      SELECT 
        a.id_asistencia, a.id_usuario, a.id_tipo, a.id_taller, a.id_competencia, a.id_foro, a.fecha, a.estado,
        u.id_usuario as usuario_id, u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.correo as usuario_correo, u.foto_url,
        te.id_tipo as tipo_id, te.nombre as tipo_nombre,
        t.id_taller as taller_id, t.titulo as taller_titulo, t.descripcion as taller_descripcion, t.horario as taller_horario, t.imagen_url as taller_imagen_url, t.anio_evento as taller_anio_evento,
        c.id_competencia as competencia_id, c.titulo as competencia_titulo, c.descripcion as competencia_descripcion, c.horario as competencia_horario, c.imagen_url as competencia_imagen_url, c.anio_evento as competencia_anio_evento,
        f.id_foro as foro_id, f.titulo as foro_titulo, f.descripcion as foro_descripcion, f.fecha_creacion as foro_fecha_creacion, f.imagen_url as foro_imagen_url
      FROM asistencia a
      INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
      INNER JOIN tipos_evento te ON a.id_tipo = te.id_tipo
      LEFT JOIN talleres t ON a.id_taller = t.id_taller
      LEFT JOIN competencias c ON a.id_competencia = c.id_competencia
      LEFT JOIN foros f ON a.id_foro = f.id_foro
      ${whereClause}
      ORDER BY a.fecha DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(limite, offset);
    const result = await pool.query(query, queryParams);

    // Consulta para contar el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM asistencia a
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2)); // Remover limit y offset

    const total = parseInt(countResult.rows[0].total);
    const totalPaginas = Math.ceil(total / limite);

    const asistencias = result.rows.map(mapRowToAsistenciaCompleta);

    const response: RespuestaListaAsistencia = {
      asistencias,
      total,
      pagina,
      limite,
      totalPaginas
    };

    res.json(response);

  } catch (error) {
    console.error('Error al obtener asistencias:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/asistencia/{id}:
 *   put:
 *     summary: Actualizar asistencia por ID
 *     tags: [Asistencia]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la asistencia
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarAsistenciaRequest'
 *     responses:
 *       200:
 *         description: Asistencia actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 asistencia:
 *                   $ref: '#/components/schemas/Asistencia'
 *       404:
 *         description: Asistencia no encontrada
 *       403:
 *         description: Sin permisos para actualizar asistencia
 */
router.put('/:id', authenticateToken, requireAnyPermission(['asistencia:update']), async (req: Request, res: Response) => {
  try {
    const idValidation = idAsistenciaSchema.safeParse(req.params);
    const bodyValidation = actualizarAsistenciaSchema.safeParse(req.body);
    
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        errors: idValidation.error.issues
      });
    }

    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        errors: bodyValidation.error.issues
      });
    }

    const { id } = idValidation.data;
    const { estado, fecha } = bodyValidation.data;

    // Verificar que la asistencia existe
    const asistenciaExistente = await pool.query('SELECT id_asistencia FROM asistencia WHERE id_asistencia = $1', [id]);
    
    if (asistenciaExistente.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asistencia no encontrada'
      });
    }

    // Construir la consulta de actualización dinámicamente
    let updateFields: string[] = [];
    let updateValues: any[] = [];
    let paramIndex = 1;

    if (estado !== undefined) {
      updateFields.push(`estado = $${paramIndex++}`);
      updateValues.push(estado);
    }

    if (fecha !== undefined) {
      updateFields.push(`fecha = $${paramIndex++}`);
      updateValues.push(fecha);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar'
      });
    }

    updateValues.push(id);

    const updateQuery = `
      UPDATE asistencia 
      SET ${updateFields.join(', ')}
      WHERE id_asistencia = $${paramIndex}
      RETURNING id_asistencia
    `;

    await pool.query(updateQuery, updateValues);

    // Obtener la asistencia actualizada
    const asistenciaActualizada = await obtenerAsistenciaPorId(id);

    const response: RespuestaAsistencia = {
      success: true,
      message: 'Asistencia actualizada exitosamente',
      asistencia: asistenciaActualizada
    };

    res.json(response);

  } catch (error) {
    console.error('Error al actualizar asistencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/asistencia/{id}:
 *   delete:
 *     summary: Eliminar asistencia por ID
 *     tags: [Asistencia]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la asistencia
 *     responses:
 *       200:
 *         description: Asistencia eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Asistencia no encontrada
 *       403:
 *         description: Sin permisos para eliminar asistencia
 */
router.delete('/:id', authenticateToken, requireAnyPermission(['asistencia:delete']), async (req: Request, res: Response) => {
  try {
    const idValidation = idAsistenciaSchema.safeParse(req.params);
    
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        errors: idValidation.error.issues
      });
    }

    const { id } = idValidation.data;

    // Verificar que la asistencia existe
    const asistenciaExistente = await pool.query('SELECT id_asistencia FROM asistencia WHERE id_asistencia = $1', [id]);
    
    if (asistenciaExistente.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asistencia no encontrada'
      });
    }

    // Eliminar la asistencia
    await pool.query('DELETE FROM asistencia WHERE id_asistencia = $1', [id]);

    res.json({
      success: true,
      message: 'Asistencia eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar asistencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Función auxiliar para obtener asistencia completa por ID
async function obtenerAsistenciaPorId(id: number): Promise<AsistenciaCompleta> {
  const query = `
    SELECT 
      a.id_asistencia, a.id_usuario, a.id_tipo, a.id_taller, a.id_competencia, a.id_foro, a.fecha,
      u.id_usuario as usuario_id, u.nombre as usuario_nombre, u.apellido as usuario_apellido, u.correo as usuario_correo, u.foto_url,
      te.id_tipo as tipo_id, te.nombre as tipo_nombre,
      t.id_taller as taller_id, t.titulo as taller_titulo, t.descripcion as taller_descripcion, t.horario as taller_horario, t.imagen_url as taller_imagen_url, t.anio_evento as taller_anio_evento,
      c.id_competencia as competencia_id, c.titulo as competencia_titulo, c.descripcion as competencia_descripcion, c.horario as competencia_horario, c.imagen_url as competencia_imagen_url, c.anio_evento as competencia_anio_evento,
      f.id_foro as foro_id, f.titulo as foro_titulo, f.descripcion as foro_descripcion, f.fecha_creacion as foro_fecha_creacion, f.imagen_url as foro_imagen_url
    FROM asistencia a
    INNER JOIN usuarios u ON a.id_usuario = u.id_usuario
    INNER JOIN tipos_evento te ON a.id_tipo = te.id_tipo
    LEFT JOIN talleres t ON a.id_taller = t.id_taller
    LEFT JOIN competencias c ON a.id_competencia = c.id_competencia
    LEFT JOIN foros f ON a.id_foro = f.id_foro
    WHERE a.id_asistencia = $1
  `;
  
  const result = await pool.query(query, [id]);
  return mapRowToAsistenciaCompleta(result.rows[0]);
}

export default router;