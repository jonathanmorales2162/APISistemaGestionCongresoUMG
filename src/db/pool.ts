import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Puedes usar una variable URI completa o los parámetros individuales
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true
  }
});

pool.connect()
  .then(() => console.log(' Conectado a PostgreSQL en Neon'))
  .catch(err => console.error(' Error conectando a PostgreSQL:', err));

export default pool;
