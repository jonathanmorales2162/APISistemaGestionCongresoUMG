import { Router } from 'express'; // valor
import type { Request, Response, NextFunction } from 'express'; // tipos
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import pool from '../db/pool.js';
import { 
  crearUsuarioSchema, 
  actualizarUsuarioSchema, 
  filtrosUsuariosSchema,
  idUsuarioSchema,
  loginUsuarioSchema
} from '../schemas/usuarios.schema.js';
import type { 
  UsuarioConRol, 
  UsuarioSinPassword, 
  ApiResponse 
} from '../types/usuarios.types.js';
import { authenticateToken } from '../middleware/auth.middleware.js';


const router = Router();

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Gestión de usuarios del sistema
 */

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Obtener lista de usuarios
 *     description: Retorna una lista paginada de todos los usuarios registrados en el sistema con sus roles asignados
 *     tags: [Usuarios]
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
 *         description: Filtrar por tipo de usuario (I = Interno, E = Externo)
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
 *         description: Cantidad de usuarios por página
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 *             example:
 *               - id_usuario: 1
 *                 nombre: "Juan"
 *                 apellido: "Pérez"
 *                 correo: "juan.perez@email.com"
 *                 telefono: "+502 1234-5678"
 *                 colegio: "Colegio San José"
 *                 tipo: "estudiante"
 *                 rol:
 *                   id_rol: 1
 *                   nombre: "Participante"
 *                 creado_en: "2024-01-15T10:30:00Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// GET /usuarios - Listar todos los usuarios con su rol
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validar query parameters
    const filtros = filtrosUsuariosSchema.parse(req.query);
    
    let query = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.correo,
        u.telefono,
        u.colegio,
        u.tipo,
        r.id_rol,
        r.nombre as rol_nombre,
        u.creado_en
      FROM usuarios u
      LEFT JOIN roles r ON u.id_rol = r.id_rol
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;

    // Aplicar filtros dinámicos
    if (filtros.nombre) {
      paramCount++;
      query += ` AND u.nombre ILIKE $${paramCount}`;
      params.push(`%${filtros.nombre}%`);
    }

    if (filtros.apellido) {
      paramCount++;
      query += ` AND u.apellido ILIKE $${paramCount}`;
      params.push(`%${filtros.apellido}%`);
    }

    if (filtros.correo) {
      paramCount++;
      query += ` AND u.correo ILIKE $${paramCount}`;
      params.push(`%${filtros.correo}%`);
    }

    if (filtros.tipo) {
      paramCount++;
      query += ` AND u.tipo = $${paramCount}`;
      params.push(filtros.tipo);
    }

    if (filtros.colegio) {
      paramCount++;
      query += ` AND u.colegio ILIKE $${paramCount}`;
      params.push(`%${filtros.colegio}%`);
    }

    // Agregar paginación
    query += ` ORDER BY u.creado_en DESC`;
    
    // Aplicar valores por defecto si no se proporcionan
    const pagina = filtros.pagina || 1;
    const limite = filtros.limite || 10;
    
    const offset = (pagina - 1) * limite;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limite);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);
    
    // Transformar los datos para que el rol sea un objeto
    const usuariosConRol: UsuarioConRol[] = result.rows.map(row => ({
      id_usuario: row.id_usuario,
      nombre: row.nombre,
      apellido: row.apellido,
      correo: row.correo,
      telefono: row.telefono,
      colegio: row.colegio,
      tipo: row.tipo,
      rol: {
        id_rol: row.id_rol,
        nombre: row.rol_nombre || 'Sin rol'
      },
      creado_en: row.creado_en
    }));
    
    const response: ApiResponse<UsuarioConRol[]> = {
      success: true,
      data: usuariosConRol
    };

    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /usuarios/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     description: Retorna la información detallada de un usuario específico incluyendo su rol asignado
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID único del usuario a consultar
 *     responses:
 *       200:
 *         description: Usuario encontrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *             example:
 *               id_usuario: 1
 *               nombre: "Juan"
 *               apellido: "Pérez"
 *               correo: "juan.perez@email.com"
 *               telefono: "+502 1234-5678"
 *               colegio: "Colegio San José"
 *               tipo: "I"
 *               rol:
 *                 id_rol: 1
 *                 nombre: "Participante"
 *               creado_en: "2024-01-15T10:30:00Z"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

// GET /usuarios/perfil - Obtener perfil del usuario autenticado
router.get('/perfil', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const query = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.correo,
        u.telefono,
        u.colegio,
        u.tipo,
        u.id_rol,
        u.creado_en,
        r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN roles r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = $1
    `;

    const result = await pool.query(query, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const usuario = result.rows[0];
    const { password, ...usuarioSinPassword } = usuario;

    return res.json({
      success: true,
      perfil: usuarioSinPassword
    });
  } catch (err) {
    next(err);
  }
});

// GET /usuarios/:id - Obtener un usuario por ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idUsuarioSchema.parse(req.params);

    const query = `
      SELECT 
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.correo,
        u.telefono,
        u.colegio,
        u.tipo,
        r.id_rol,
        r.nombre as rol_nombre,
        u.creado_en
      FROM usuarios u
      LEFT JOIN roles r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Transformar los datos para que el rol sea un objeto
    const row = result.rows[0];
    const usuarioConRol: UsuarioConRol = {
      id_usuario: row.id_usuario,
      nombre: row.nombre,
      apellido: row.apellido,
      correo: row.correo,
      telefono: row.telefono,
      colegio: row.colegio,
      tipo: row.tipo,
      rol: {
        id_rol: row.id_rol,
        nombre: row.rol_nombre || 'Sin rol'
      },
      creado_en: row.creado_en
    };

    const response: ApiResponse<UsuarioConRol> = {
      success: true,
      data: usuarioConRol
    };

    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Crear un nuevo usuario
 *     description: Registra un nuevo usuario en el sistema con la información proporcionada
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearUsuario'
 *           example:
 *             nombre: "María"
 *             apellido: "González"
 *             correo: "maria.gonzalez@email.com"
 *             telefono: "+502 9876-5432"
 *             colegio: "Instituto Nacional"
 *             tipo: "E"
 *             password: "password123"
 *             id_rol: 2
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 id_usuario: 2
 *                 nombre: "María"
 *                 apellido: "González"
 *                 correo: "maria.gonzalez@email.com"
 *                 telefono: "+502 9876-5432"
 *                 colegio: "Instituto Nacional"
 *                 tipo: "E"
 *                 rol:
 *                   id_rol: 2
 *                   nombre: "Organizador"
 *                 creado_en: "2024-01-15T11:00:00Z"
 *               message: "Usuario creado exitosamente"
 *       400:
 *         description: Error de validación o correo ya registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               email_exists:
 *                 summary: Correo ya registrado
 *                 value:
 *                   success: false
 *                   message: "El correo electrónico ya está registrado"
 *               invalid_role:
 *                 summary: Rol inválido
 *                 value:
 *                   success: false
 *                   message: "El rol especificado no existe"
 *               validation_error:
 *                 $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// POST /usuarios - Crear un nuevo usuario
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userData = crearUsuarioSchema.parse(req.body);

    // Verificar si el correo ya existe
    const existingUser = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE correo = $1',
      [userData.correo]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado'
      });
    }

    // Verificar si el rol existe
    const roleExists = await pool.query(
      'SELECT id_rol FROM roles WHERE id_rol = $1',
      [userData.id_rol]
    );

    if (roleExists.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El rol especificado no existe'
      });
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    // Insertar el nuevo usuario
    const insertQuery = `
      INSERT INTO usuarios (
        nombre, apellido, correo, telefono, colegio, tipo, password_hash, id_rol
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_usuario, nombre, apellido, correo, telefono, colegio, tipo, id_rol, creado_en
    `;

    const values = [
      userData.nombre,
      userData.apellido,
      userData.correo,
      userData.telefono || null,
      userData.colegio || null,
      userData.tipo,
      passwordHash,
      userData.id_rol
    ];

    const result = await pool.query(insertQuery, values);
    const newUser = result.rows[0];

    // Obtener el nombre del rol para la respuesta
    const roleQuery = await pool.query(
      'SELECT nombre FROM roles WHERE id_rol = $1',
      [newUser.id_rol]
    );

    const userWithRole: UsuarioConRol = {
      ...newUser,
      rol: {
        id_rol: newUser.id_rol,
        nombre: roleQuery.rows[0]?.nombre || 'Sin rol'
      }
    };

    const response: ApiResponse<UsuarioConRol> = {
      success: true,
      data: userWithRole,
      message: 'Usuario creado exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /usuarios/login:
 *   post:
 *     summary: Iniciar sesión de usuario
 *     description: Autentica un usuario con correo y contraseña, retorna un token JWT
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correo
 *               - password
 *             properties:
 *               correo:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del usuario
 *                 example: "juan.perez@email.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Contraseña del usuario (mínimo 8 caracteres)
 *                 example: "miPassword123"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token JWT para autenticación
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                       message:
 *                         type: string
 *                       path:
 *                         type: array
 *                         items:
 *                           type: string
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Credenciales inválidas"
 *       500:
 *         description: Error interno del servidor
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const loginSchema = z.object({
    correo: z.string().email(),
    password: z.string().min(8)
  });

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  const { correo, password } = parsed.data;

  try {
    const result = await pool.query(
      'SELECT id_usuario, password_hash FROM usuarios WHERE correo = $1',
      [correo]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id_usuario: user.id_usuario },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    return res.json({ token });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /usuarios/perfil:
 *   put:
 *     summary: Actualizar perfil del usuario autenticado
 *     description: Actualiza la información del perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre del usuario
 *                 example: "Jonathan"
 *               apellido:
 *                 type: string
 *                 description: Apellido del usuario
 *                 example: "Morales"
 *               telefono:
 *                 type: string
 *                 description: Número de teléfono del usuario
 *                 example: "12345678"
 *               colegio:
 *                 type: string
 *                 description: Institución educativa del usuario
 *                 example: "Universidad Mariano Gálvez"
 *               tipo:
 *                 type: string
 *                 enum: ["I", "E"]
 *                 description: Tipo de usuario (I=Interno, E=Externo)
 *                 example: "I"
 *               id_rol:
 *                 type: integer
 *                 description: ID del rol del usuario
 *                 example: 2
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
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
 *                   example: "Perfil actualizado exitosamente"
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     id_usuario:
 *                       type: string
 *                       example: "1"
 *                     nombre:
 *                       type: string
 *                       example: "Jonathan"
 *                     apellido:
 *                       type: string
 *                       example: "Morales"
 *                     correo:
 *                       type: string
 *                       format: email
 *                       example: "jonathanm@gmail.com"
 *                     telefono:
 *                       type: string
 *                       example: "12345678"
 *                     colegio:
 *                       type: string
 *                       example: "Universidad Mariano Gálvez"
 *                     tipo:
 *                       type: string
 *                       example: "I"
 *                     id_rol:
 *                       type: string
 *                       example: "2"
 *                     creado_en:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Error de validación o datos inválidos
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
 *                   example: "Datos de entrada inválidos"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "telefono"
 *                       message:
 *                         type: string
 *                         example: "El teléfono debe tener al menos 8 dígitos"
 *       401:
 *         description: Token de acceso requerido o usuario no autenticado
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
 *                   example: "Usuario no autenticado"
 *       403:
 *         description: Token inválido o expirado
 *       500:
 *         description: Error interno del servidor
 */

// PUT /usuarios/perfil - Actualizar perfil del usuario autenticado
router.put('/perfil', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const updateData = actualizarUsuarioSchema.parse(req.body);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar'
      });
    }


    // Verificar si el rol existe (si se está actualizando)
    if (updateData.id_rol) {
      const roleCheck = await pool.query(
        'SELECT id_rol FROM roles WHERE id_rol = $1',
        [updateData.id_rol]
      );

      if (roleCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El rol especificado no existe'
        });
      }
    }

    // Construir la consulta de actualización dinámicamente
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

    const query = `
      UPDATE usuarios 
      SET ${setClause}
      WHERE id_usuario = $${fields.length + 1}
      RETURNING id_usuario, nombre, apellido, correo, telefono, colegio, tipo, id_rol, creado_en
    `;

    const result = await pool.query(query, [...values, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    return res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      usuario: result.rows[0]
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: err.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(err);
  }
});

/**
 * @swagger
 * /usuarios/password:
 *   patch:
 *     summary: Cambiar contraseña del usuario autenticado
 *     description: Permite al usuario autenticado cambiar su contraseña actual por una nueva
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Contraseña actual del usuario
 *                 example: "password123"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]"
 *                 description: Nueva contraseña (debe contener al menos 8 caracteres, 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial)
 *                 example: "NewPassword123!"
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
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
 *                   example: "Contraseña actualizada exitosamente"
 *       400:
 *         description: Error de validación o contraseña incorrecta
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
 *                   examples:
 *                     invalid_current:
 *                       summary: Contraseña actual incorrecta
 *                       value: "La contraseña actual es incorrecta"
 *                     same_password:
 *                       summary: Nueva contraseña igual a la actual
 *                       value: "La nueva contraseña debe ser diferente a la actual"
 *                     validation_error:
 *                       summary: Error de validación
 *                       value: "Datos de entrada inválidos"
 *                 errors:
 *                   type: array
 *                   description: Detalles de errores de validación (solo cuando hay errores de validación)
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "newPassword"
 *                       message:
 *                         type: string
 *                         example: "La nueva contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial"
 *       401:
 *         description: Token de acceso requerido o usuario no autenticado
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
 *                   example: "Usuario no autenticado"
 *       403:
 *         description: Token inválido o expirado
 *       404:
 *         description: Usuario no encontrado
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
 *                   example: "Usuario no encontrado"
 *       500:
 *         description: Error interno del servidor
 */

// PATCH /usuarios/password - Cambiar contraseña del usuario autenticado
router.patch('/password', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const passwordSchema = z.object({
      currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
      newPassword: z.string()
        .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
          'La nueva contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial')
    });

    const { currentPassword, newPassword } = passwordSchema.parse(req.body);

    // Obtener la contraseña actual del usuario
    const userQuery = await pool.query(
      'SELECT password_hash FROM usuarios WHERE id_usuario = $1',
      [req.user.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = userQuery.rows[0];

    // Verificar la contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña actual es incorrecta'
      });
    }

    // Verificar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe ser diferente a la actual'
      });
    }

    // Hashear la nueva contraseña
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar la contraseña
    await pool.query(
      'UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2',
      [hashedNewPassword, req.user.id]
    );

    return res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: err.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(err);
  }
});

/**
 * @swagger
 * /usuarios/perfil:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     description: Obtiene la información del perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 perfil:
 *                   type: object
 *                   properties:
 *                     id_usuario:
 *                       type: string
 *                       format: uuid
 *                     nombre:
 *                       type: string
 *                     apellido:
 *                       type: string
 *                     correo:
 *                       type: string
 *                       format: email
 *                     telefono:
 *                       type: string
 *                     colegio:
 *                       type: string
 *                     tipo:
 *                       type: string
 *                     id_rol:
 *                       type: string
 *                       format: uuid
 *                     creado_en:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Token de acceso requerido
 *       403:
 *         description: Token inválido o expirado
 *       404:
 *         description: Usuario no encontrado
 */


/**
 * @swagger
 * /usuarios/{id}:
 *   put:
 *     summary: Actualizar un usuario existente
 *     description: Actualiza la información de un usuario específico en el sistema
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID único del usuario a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarUsuario'
 *           example:
 *             nombre: "Juan Carlos"
 *             apellido: "Pérez López"
 *             correo: "juan.carlos@email.com"
 *             telefono: "+502 1111-2222"
 *             colegio: "Universidad de San Carlos"
 *             tipo: "I"
 *             id_rol: 3
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 id_usuario: 1
 *                 nombre: "Juan Carlos"
 *                 apellido: "Pérez López"
 *                 correo: "juan.carlos@email.com"
 *                 telefono: "+502 1111-2222"
 *                 colegio: "Universidad de San Carlos"
 *                 tipo: "I"
 *                 rol:
 *                   id_rol: 3
 *                   nombre: "Administrador"
 *                 creado_en: "2024-01-15T10:30:00Z"
 *               message: "Usuario actualizado exitosamente"
 *       400:
 *         description: Error de validación o datos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missing_fields:
 *                 summary: Campos faltantes
 *                 value:
 *                   success: false
 *                   message: "No se proporcionaron campos para actualizar"
 *               invalid_role:
 *                 summary: Rol inválido
 *                 value:
 *                   success: false
 *                   message: "El rol especificado no existe"
 *               validation_error:
 *                 $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// PUT /usuarios/:id - Actualizar un usuario
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idUsuarioSchema.parse(req.params);
    const updateData = actualizarUsuarioSchema.parse(req.body);

    // Verificar si el usuario existe
    const userExists = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = $1',
      [id]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el rol existe (si se está actualizando)
    if (updateData.id_rol) {
      const roleExists = await pool.query(
        'SELECT id_rol FROM roles WHERE id_rol = $1',
        [updateData.id_rol]
      );

      if (roleExists.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El rol especificado no existe'
        });
      }
    }

    // Construir la consulta de actualización dinámicamente
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar'
      });
    }

    // Agregar el ID del usuario al final
    paramCount++;
    values.push(id);

    const updateQuery = `
      UPDATE usuarios 
      SET ${updateFields.join(', ')}
      WHERE id_usuario = $${paramCount}
      RETURNING id_usuario, nombre, apellido, correo, telefono, colegio, tipo, id_rol, creado_en
    `;

    const result = await pool.query(updateQuery, values);
    const updatedUser = result.rows[0];

    // Obtener el nombre del rol para la respuesta
    const roleQuery = await pool.query(
      'SELECT nombre FROM roles WHERE id_rol = $1',
      [updatedUser.id_rol]
    );

    const userWithRole: UsuarioConRol = {
      ...updatedUser,
      rol: {
        id_rol: updatedUser.id_rol,
        nombre: roleQuery.rows[0]?.nombre || 'Sin rol'
      }
    };

    const response: ApiResponse<UsuarioConRol> = {
      success: true,
      data: userWithRole,
      message: 'Usuario actualizado exitosamente'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /usuarios/{id}:
 *   delete:
 *     summary: Eliminar un usuario
 *     description: Elimina permanentemente un usuario del sistema
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID único del usuario a eliminar
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "Usuario eliminado exitosamente"
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// DELETE /usuarios/:id - Eliminar un usuario
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = idUsuarioSchema.parse(req.params);

    // Verificar si el usuario existe
    const userExists = await pool.query(
      'SELECT id_usuario, nombre, apellido FROM usuarios WHERE id_usuario = $1',
      [id]
    );

    if (userExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Eliminar el usuario
    await pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);

    const response: ApiResponse<null> = {
      success: true,
      message: `Usuario eliminado exitosamente`
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;