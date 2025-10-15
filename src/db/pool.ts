import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Configuración mejorada del pool para manejar conexiones perdidas
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true
  },
  max: 20, // Máximo número de conexiones en el pool
  idleTimeoutMillis: 30000, // Tiempo antes de cerrar conexiones inactivas
  connectionTimeoutMillis: 2000, // Tiempo máximo para establecer conexión
  keepAlive: true, // Mantener conexiones vivas
  keepAliveInitialDelayMillis: 10000 // Delay inicial para keep-alive
});

// Manejador de errores del pool para conexiones perdidas
pool.on('error', (err: NodeJS.ErrnoException) => {
  console.error('Error inesperado en el pool de conexiones:', err);

  if (err.code === 'ECONNRESET' || err.message?.includes('Connection terminated')) {
    console.log('Intentando reconectar...');
  } else {
    console.error('Error no manejado por el pool:', err);
  }
});

// Función para probar la conexión inicial
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log(' Conectado a PostgreSQL en Neon');
    client.release(); // Liberar el cliente de vuelta al pool
  } catch (err) {
    console.error(' Error conectando a PostgreSQL:', err);
    // No terminar el proceso, dejar que el pool maneje las reconexiones
  }
};

// Probar conexión inicial
testConnection();

export default pool;
