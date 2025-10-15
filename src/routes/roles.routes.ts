import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Gestión de roles del sistema
 */

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Obtener todos los roles
 *     description: Obtiene la lista completa de roles disponibles en el sistema
 *     tags: [Roles]
 *     responses:
 *       200:
 *         description: Lista de roles obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Rol'
 *             example:
 *               - id_rol: 1
 *                 nombre: "Administrador"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT id_rol, nombre FROM roles ORDER BY id_rol');
    res.json(result.rows);
  } catch (err) {
    console.error("Error en /roles:", err);
    next(err);
  }
});

export default router;
