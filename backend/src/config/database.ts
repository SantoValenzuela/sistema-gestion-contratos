import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const sqlConfig: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 1433,
  options: {
    encrypt: false,             // true si estás usando Azure
    trustServerCertificate: true // útil en desarrollo local
  }
};

let pool: sql.ConnectionPool | null = null;

/**
 * Devuelve una conexión (pool) a SQL Server.
 * Reutiliza el mismo pool para no crear conexiones nuevas cada vez.
 */
export async function getConnection(): Promise<sql.ConnectionPool> {
  if (pool) {
    return pool;
  }

  try {
    pool = await sql.connect(sqlConfig);
    console.log('✅ Conectado a SQL Server (pool inicializado)');
    return pool;
  } catch (error) {
    console.error('❌ Error conectando a SQL Server:', error);
    throw error;
  }
}
