import { Router, Request, Response } from 'express';
import { getConnection } from '../../config/database';
import { hashPassword, comparePassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import sql from 'mssql';

const router = Router();

/**
 * POST /auth/register
 * Body: { name, email, password }
 */
/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Registra un nuevo usuario.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Santo Valenzuela"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "santo@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "MiPasswordSegura123"
 *     responses:
 *       201:
 *         description: Usuario registrado correctamente.
 *       400:
 *         description: Datos incompletos.
 *       409:
 *         description: El correo ya está registrado.
 */

router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    return res.status(400).json({
      message: 'name, email y password son obligatorios'
    });
  }

  try {
    const pool = await getConnection();

    // Verificar si el email ya existe
    const existing = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query('SELECT id FROM dbo.users WHERE email = @email');

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        message: 'El correo ya está registrado'
      });
    }

    // Hashear contraseña
    const passwordHash = await hashPassword(password);

    // Insertar usuario nuevo
    const result = await pool
      .request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('password_hash', sql.NVarChar, passwordHash)
      .input('role', sql.NVarChar, 'USER')
      .input('status', sql.NVarChar, 'ACTIVE')
      .query(`
        INSERT INTO dbo.users (name, email, password_hash, role, status)
        OUTPUT inserted.id, inserted.name, inserted.email, inserted.role, inserted.status, inserted.created_at
        VALUES (@name, @email, @password_hash, @role, @status);
      `);

    const user = result.recordset[0];

    return res.status(201).json({
      message: 'Usuario registrado correctamente',
      user
    });
  } catch (error) {
    console.error('Error en /auth/register:', error);
    return res.status(500).json({
      message: 'Error interno al registrar usuario'
    });
  }
});

/**
 * POST /auth/login
 * Body: { email, password }
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Inicia sesión y devuelve un token JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "santo@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "MiPasswordSegura123"
 *     responses:
 *       200:
 *         description: Login exitoso.
 *       400:
 *         description: Datos incompletos.
 *       401:
 *         description: Credenciales inválidas.
 */

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res.status(400).json({
      message: 'email y password son obligatorios'
    });
  }

  try {
    const pool = await getConnection();

    // Buscar usuario por email
    const result = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT id, name, email, password_hash, role, status
        FROM dbo.users
        WHERE email = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({
        message: 'Credenciales inválidas'
      });
    }

    const user = result.recordset[0];

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        message: 'Usuario inactivo'
      });
    }

    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Credenciales inválidas'
      });
    }

    // Crear token JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // No devolver el password_hash
    delete user.password_hash;

    return res.json({
      message: 'Login exitoso',
      token,
      user
    });
  } catch (error) {
    console.error('Error en /auth/login:', error);
    return res.status(500).json({
      message: 'Error interno al iniciar sesión'
    });
  }
});

export default router;
