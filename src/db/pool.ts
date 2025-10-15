import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Configuración optimizada para Vercel (serverless)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true
  },
  // Configuración optimizada para serverless
  max: process.env.NODE_ENV === 'production' ? 1 : 10, // Menos conexiones en producción
  idleTimeoutMillis: 10000, // Cerrar conexiones inactivas más rápido
  connectionTimeoutMillis: 10000, // Más tiempo para establecer conexión
  query_timeout: 30000, // Timeout para queries
  statement_timeout: 30000, // Timeout para statements
  keepAlive: false, // Deshabilitar keep-alive en serverless
  allowExitOnIdle: true // Permitir que el proceso termine cuando no hay conexiones activas
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

// Función para probar la conexión inicial (solo en desarrollo)
const testConnection = async () => {
  // Solo probar conexión en desarrollo, no en producción/Vercel
  if (process.env.NODE_ENV === 'development') {
    try {
      const client = await pool.connect();
      console.log('✅ Conectado a PostgreSQL en Neon');
      client.release(); // Liberar el cliente de vuelta al pool
    } catch (err) {
      console.error('❌ Error conectando a PostgreSQL:', err);
      // No terminar el proceso, dejar que el pool maneje las reconexiones
    }
  }
};

// Probar conexión inicial solo en desarrollo
testConnection();

export default pool;
