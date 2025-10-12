import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import pool from './db/pool.js';

const PORT = Number(process.env.PORT) || 4000;

(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (e) {
    console.error('Error conectando a PostgreSQL:', e);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
})();
