import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getConnection } from './config/database';
import authRouter from './modules/auth/auth.routes';
import contractsRouter from './modules/contracts/contracts.routes';
import { authMiddleware } from './middlewares/auth';
import { swaggerUi, swaggerSpec } from './config/swagger';



dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
// Swagger Docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas de autenticación
app.use('/auth', authRouter);
// Rutas Protegidas de contratos
app.use('/contracts', authMiddleware, contractsRouter);

// Endpoint de salud / prueba de conexión a la BD
app.get('/health', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT 1 AS ok');
    res.json({
      status: 'ok',
      database: 'connected',
      result: result.recordset
    });
  } catch (error) {
    console.error('Error en /health:', error);
    res.status(500).json({
      status: 'error',
      database: 'error',
      message: (error as Error).message
    });
  }
});

// Función para arrancar el servidor
async function startServer() {
  try {
    // Probamos conexión a la BD antes de levantar el server
    await getConnection();

    app.listen(PORT, () => {
      console.log(`🚀 API escuchando en http://localhost:${PORT}/docs`);
    });
  } catch (error) {
    console.error('❌ No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
