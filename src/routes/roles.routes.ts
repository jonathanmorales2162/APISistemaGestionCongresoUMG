import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

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
