import { Router, Response } from 'express';
import sql from 'mssql';
import { getConnection } from '../../config/database';
import { AuthRequest } from '../../middlewares/auth';
import {
  registerContractOnChain,
  getOnChainContractByBackendId
} from '../../services/blockchainService';


const router = Router();

/**
 * POST /contracts
 * Crea un contrato con el usuario autenticado como CREATOR
 * Body: { title, description?, totalValue?, currency?, effectiveDate?, terminationDate? }
 */

/**
 * @openapi
 * /contracts:
 *   post:
 *     tags:
 *       - Contracts
 *     summary: Crea un nuevo contrato para el usuario autenticado.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Contrato de Servicios de Desarrollo"
 *               description:
 *                 type: string
 *                 example: "Contrato para el desarrollo del sistema de gestión de contratos."
 *               totalValue:
 *                 type: number
 *                 example: 5000
 *               currency:
 *                 type: string
 *                 example: "USD"
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-01"
 *               terminationDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-31"
 *     responses:
 *       201:
 *         description: Contrato creado correctamente.
 *       400:
 *         description: Datos inválidos.
 *       401:
 *         description: No autenticado.
 */

router.post('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  const {
    title,
    description,
    totalValue,
    currency,
    effectiveDate,
    terminationDate
  } = req.body as {
    title?: string;
    description?: string;
    totalValue?: number;
    currency?: string;
    effectiveDate?: string;
    terminationDate?: string;
  };

  if (!title) {
    return res.status(400).json({ message: 'title es obligatorio' });
  }

  try {
    const pool = await getConnection();

    // Insertar contrato
    const contractResult = await pool
      .request()
      .input('title', sql.NVarChar, title)
      .input('description', sql.NVarChar, description || null)
      .input('owner_user_id', sql.UniqueIdentifier, user.userId)
      .input('status', sql.NVarChar, 'DRAFT')
      .input('total_value', sql.Decimal(18, 2), totalValue ?? null)
      .input('currency', sql.NVarChar, currency || null)
      .input('effective_date', sql.Date, effectiveDate || null)
      .input('termination_date', sql.Date, terminationDate || null)
      .query(`
        INSERT INTO dbo.contracts (
          title, description, owner_user_id, status,
          total_value, currency, effective_date, termination_date
        )
        OUTPUT inserted.*
        VALUES (
          @title, @description, @owner_user_id, @status,
          @total_value, @currency, @effective_date, @termination_date
        );
      `);

    const contract = contractResult.recordset[0];

    // Insertar participante CREATOR (aceptado por defecto)
    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, contract.id)
      .input('user_id', sql.UniqueIdentifier, user.userId)
      .input('role_in_contract', sql.NVarChar, 'CREATOR')
      .input('signing_status', sql.NVarChar, 'ACCEPTED')
      .query(`
        INSERT INTO dbo.contract_participants (
          contract_id, user_id, role_in_contract, signing_status
        )
        VALUES (
          @contract_id, @user_id, @role_in_contract, @signing_status
        );
      `);

    // Registrar evento CREATED
    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, contract.id)
      .input('event_type', sql.NVarChar, 'CREATED')
      .input('triggered_by_user_id', sql.UniqueIdentifier, user.userId)
      .input('metadata', sql.NVarChar, null)
      .query(`
        INSERT INTO dbo.contract_events (
          contract_id, event_type, triggered_by_user_id, metadata
        )
        VALUES (
          @contract_id, @event_type, @triggered_by_user_id, @metadata
        );
      `);

    return res.status(201).json({
      message: 'Contrato creado correctamente',
      contract
    });
  } catch (error) {
    console.error('Error en POST /contracts:', error);
    return res.status(500).json({ message: 'Error interno al crear el contrato' });
  }
});

/**
 * GET /contracts
 * Lista contratos donde el usuario autenticado es participante
 */
/**
 * @openapi
 * /contracts:
 *   get:
 *     tags:
 *       - Contracts
 *     summary: Lista los contratos donde el usuario autenticado es participante.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de contratos.
 *       401:
 *         description: No autenticado.
 */

router.get('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  try {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('user_id', sql.UniqueIdentifier, user.userId)
      .query(`
        SELECT DISTINCT c.*
        FROM dbo.contracts c
        INNER JOIN dbo.contract_participants cp
          ON cp.contract_id = c.id
        WHERE cp.user_id = @user_id
        ORDER BY c.created_at DESC;
      `);

    return res.json({
      contracts: result.recordset
    });
  } catch (error) {
    console.error('Error en GET /contracts:', error);
    return res.status(500).json({ message: 'Error interno al listar contratos' });
  }
});
/**
 * @openapi
 * /contracts/{id}/onchain:
 *   get:
 *     tags:
 *       - Contracts
 *     summary: Consulta el estado del contrato en la blockchain.
 *     description: Devuelve si el contrato está registrado on-chain y la información básica almacenada en el smart contract, siempre que el usuario sea participante del contrato.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del contrato en la base de datos (GUID).
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Información on-chain del contrato o indicación de que no está registrado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: El usuario no es participante del contrato.
 *       404:
 *         description: Contrato no encontrado.
 */
router.get('/:id/onchain', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  try {
    const pool = await getConnection();

    // Verificar que el contrato existe y que el usuario es participante
    const contractResult = await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('user_id', sql.UniqueIdentifier, user.userId)
      .query(`
        SELECT c.id,
               c.title,
               c.status,
               c.on_chain,
               c.smart_contract_address,
               c.blockchain_network
        FROM dbo.contracts c
        INNER JOIN dbo.contract_participants cp
          ON cp.contract_id = c.id
        WHERE c.id = @contract_id
          AND cp.user_id = @user_id;
      `);

    if (contractResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ message: 'Contrato no encontrado o sin acceso' });
    }

    const contract = contractResult.recordset[0];

    // Consultar en la blockchain
    let onChainInfo;
    try {
      onChainInfo = await getOnChainContractByBackendId(id);
    } catch (err) {
      console.error('Error consultando blockchain:', err);
      return res
        .status(500)
        .json({ message: 'Error consultando la blockchain' });
    }

    return res.json({
      contract,
      onChain: onChainInfo
    });
  } catch (error) {
    console.error('Error en GET /contracts/:id/onchain:', error);
    return res
      .status(500)
      .json({ message: 'Error interno al consultar contrato on-chain' });
  }
});

/**
 * GET /contracts/:id
 * Devuelve el detalle de un contrato si el usuario es participante
 */

/**
 * @openapi
 * /contracts/{id}:
 *   get:
 *     tags:
 *       - Contracts
 *     summary: Obtiene el detalle de un contrato (datos, participantes y eventos) si el usuario es participante.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del contrato (GUID).
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Detalle del contrato.
 *       401:
 *         description: No autenticado.
 *       404:
 *         description: Contrato no encontrado o sin acceso.
 */

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  try {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('user_id', sql.UniqueIdentifier, user.userId)
      .query(`
        SELECT c.*
        FROM dbo.contracts c
        INNER JOIN dbo.contract_participants cp
          ON cp.contract_id = c.id
        WHERE c.id = @contract_id
          AND cp.user_id = @user_id;
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Contrato no encontrado o sin acceso' });
    }

    const contract = result.recordset[0];

    // Traer también participantes y eventos (útil para el front)
    const [participantsResult, eventsResult] = await Promise.all([
      pool
        .request()
        .input('contract_id', sql.UniqueIdentifier, id)
        .query(`
          SELECT cp.contract_id, cp.user_id, u.name, u.email,
                 cp.role_in_contract, cp.signing_status, cp.signed_at
          FROM dbo.contract_participants cp
          INNER JOIN dbo.users u
            ON u.id = cp.user_id
          WHERE cp.contract_id = @contract_id;
        `),
      pool
        .request()
        .input('contract_id', sql.UniqueIdentifier, id)
        .query(`
          SELECT ce.*
          FROM dbo.contract_events ce
          WHERE ce.contract_id = @contract_id
          ORDER BY ce.created_at ASC;
        `)
    ]);

    return res.json({
      contract,
      participants: participantsResult.recordset,
      events: eventsResult.recordset
    });
  } catch (error) {
    console.error('Error en GET /contracts/:id:', error);
    return res.status(500).json({ message: 'Error interno al obtener el contrato' });
  }
});

/**
 * POST /contracts/:id/invite
 * Invita a otro usuario (por email) como COUNTERPART al contrato.
 * Solo el owner del contrato puede invitar.
 */
/**
 * @openapi
 * /contracts/{id}/invite:
 *   post:
 *     tags:
 *       - Contracts
 *     summary: Invita a un usuario existente (por email) como contraparte del contrato.
 *     description: Solo el usuario creador (owner) del contrato puede invitar participantes.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del contrato (GUID).
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "contraparte@example.com"
 *     responses:
 *       201:
 *         description: Participante invitado correctamente.
 *       400:
 *         description: Datos inválidos o estado del contrato no permite invitaciones.
 *       401:
 *         description: No autenticado.
 *       404:
 *         description: Contrato o usuario no encontrado.
 *       409:
 *         description: El usuario ya es participante del contrato.
 */
router.post('/:id/invite', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;
  const { email } = req.body;

  if (!user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  if (!email) {
    return res
      .status(400)
      .json({ message: 'Debes indicar el correo de la contraparte.' });
  }

  try {
    const pool = await getConnection();

    // 1) Verificar que el contrato existe y que el usuario es el CREATOR
    const contractResult = await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('user_id', sql.UniqueIdentifier, user.userId)
      .query(`
        SELECT 
          c.id,
          c.status,
          c.on_chain
        FROM dbo.contracts c
        INNER JOIN dbo.contract_participants cp
          ON cp.contract_id = c.id
        WHERE c.id = @contract_id
          AND cp.user_id = @user_id
          AND cp.role_in_contract = 'CREATOR';
      `);

    if (contractResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ message: 'Contrato no encontrado o no eres el creador.' });
    }

    const contract = contractResult.recordset[0] as {
      id: string;
      status: string;
      on_chain: boolean | number | null;
    };

    const finalStates = ['ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED'];

    // 2) Regla Opción A: no se puede invitar en estados finales
    if (finalStates.includes(contract.status)) {
      return res.status(400).json({
        message:
          'No se pueden invitar nuevas contrapartes en el estado actual del contrato.',
      });
    }

    // 3) Regla Opción A: no se puede invitar si ya está registrado on-chain
    const isOnChain =
      contract.on_chain === true ||
      contract.on_chain === 1;

    if (isOnChain) {
      return res.status(400).json({
        message:
          'Este contrato ya está registrado en blockchain. No se pueden agregar nuevos participantes.',
      });
    }

    // 4) Buscar al usuario por email
    const userResult = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT id, name, email
        FROM dbo.users
        WHERE email = @email;
      `);

    if (userResult.recordset.length === 0) {
      return res
        .status(404)
        .json({ message: 'No existe un usuario con ese correo.' });
    }

    const invitedUser = userResult.recordset[0];

    // 5) Verificar que no exista ya como participante
    const existingParticipant = await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('user_id', sql.UniqueIdentifier, invitedUser.id)
      .query(`
        SELECT 1
        FROM dbo.contract_participants
        WHERE contract_id = @contract_id
          AND user_id = @user_id;
      `);

    if (existingParticipant.recordset.length > 0) {
      return res.status(409).json({
        message: 'Este usuario ya es participante del contrato.',
      });
    }

    // 6) Insertar como contraparte
    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('user_id', sql.UniqueIdentifier, invitedUser.id)
      .input('role_in_contract', sql.NVarChar, 'COUNTERPART')
      .input('signing_status', sql.NVarChar, 'PENDING')
      .query(`
        INSERT INTO dbo.contract_participants (
          contract_id,
          user_id,
          role_in_contract,
          signing_status
        )
        VALUES (
          @contract_id,
          @user_id,
          @role_in_contract,
          @signing_status
        );
      `);

    // 7) Registrar evento de invitación
    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('event_type', sql.NVarChar, 'PARTICIPANT_INVITED')
      .input('triggered_by_user_id', sql.UniqueIdentifier, user.userId)
      .input(
        'metadata',
        sql.NVarChar,
        `Invitado ${invitedUser.email} como contraparte.`
      )
      .query(`
        INSERT INTO dbo.contract_events (
          contract_id,
          event_type,
          triggered_by_user_id,
          metadata
        )
        VALUES (
          @contract_id,
          @event_type,
          @triggered_by_user_id,
          @metadata
        );
      `);

    return res.status(201).json({
      message: 'Contraparte invitada correctamente.',
    });
  } catch (error) {
    console.error('Error en POST /contracts/:id/invite:', error);
    return res
      .status(500)
      .json({ message: 'Error interno al invitar contraparte.' });
  }
});


/**
 * POST /contracts/:id/submit
 * El owner envía el contrato a revisión: DRAFT -> IN_REVIEW
 */

/**
 * @openapi
 * /contracts/{id}/submit:
 *   post:
 *     tags:
 *       - Contracts
 *     summary: Envía el contrato a revisión (DRAFT → IN_REVIEW).
 *     description: Solo el usuario dueño del contrato puede enviar a revisión.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del contrato (GUID).
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contrato enviado a revisión.
 *       400:
 *         description: El contrato no está en estado DRAFT.
 *       401:
 *         description: No autenticado.
 *       404:
 *         description: Contrato no encontrado o no eres el dueño.
 */

router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  try {
    const pool = await getConnection();

    // Verificar contrato y owner
    const contractResult = await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('owner_user_id', sql.UniqueIdentifier, user.userId)
      .query(`
        SELECT id, status
        FROM dbo.contracts
        WHERE id = @contract_id
          AND owner_user_id = @owner_user_id;
      `);

    if (contractResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Contrato no encontrado o no eres el dueño' });
    }

    const contract = contractResult.recordset[0];

    if (contract.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Solo los contratos en DRAFT pueden enviarse a revisión' });
    }

    // Actualizar estado a IN_REVIEW
    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, 'IN_REVIEW')
      .query(`
        UPDATE dbo.contracts
        SET status = @status,
            updated_at = SYSDATETIME()
        WHERE id = @contract_id;
      `);

    // Evento
    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('event_type', sql.NVarChar, 'SUBMITTED_FOR_REVIEW')
      .input('triggered_by_user_id', sql.UniqueIdentifier, user.userId)
      .input('metadata', sql.NVarChar, null)
      .query(`
        INSERT INTO dbo.contract_events (
          contract_id, event_type, triggered_by_user_id, metadata
        )
        VALUES (
          @contract_id, @event_type, @triggered_by_user_id, @metadata
        );
      `);

    return res.json({ message: 'Contrato enviado a revisión' });
  } catch (error) {
    console.error('Error en POST /contracts/:id/submit:', error);
    return res.status(500).json({ message: 'Error interno al enviar contrato a revisión' });
  }
});

/**
 * POST /contracts/:id/accept
 * La contraparte acepta el contrato. Si todos aceptan -> contrato ACTIVE.
 */
/**
 * @openapi
 * /contracts/{id}/accept:
 *   post:
 *     tags:
 *       - Contracts
 *     summary: Acepta el contrato como participante.
 *     description: Solo usuarios participantes distintos del creador pueden aceptar. Si todos aceptan, el contrato pasa a ACTIVE.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del contrato (GUID).
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contrato aceptado por el participante.
 *       400:
 *         description: Estado del contrato no válido o el usuario ya aceptó / rechazó.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: El usuario no es participante del contrato.
 *       404:
 *         description: Contrato no encontrado.
 */

router.post('/:id/accept', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  try {
    const pool = await getConnection();

    // Verificar que el contrato esté en IN_REVIEW y que el usuario sea participante
       const contractResult = await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .query(`
        SELECT id, status, title, total_value, currency
        FROM dbo.contracts
        WHERE id = @contract_id;
      `);

    if (contractResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Contrato no encontrado' });
    }

    const contract = contractResult.recordset[0];

    if (contract.status !== 'IN_REVIEW') {
      return res.status(400).json({ message: 'Solo se pueden aceptar contratos en IN_REVIEW' });
    }

    // Verificar participante
    const participantResult = await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('user_id', sql.UniqueIdentifier, user.userId)
      .query(`
        SELECT role_in_contract, signing_status
        FROM dbo.contract_participants
        WHERE contract_id = @contract_id
          AND user_id = @user_id;
      `);

    if (participantResult.recordset.length === 0) {
      return res.status(403).json({ message: 'No eres participante de este contrato' });
    }

    const participant = participantResult.recordset[0];

    if (participant.role_in_contract === 'CREATOR') {
      return res.status(400).json({ message: 'El creador no necesita aceptar el contrato' });
    }

    if (participant.signing_status === 'ACCEPTED') {
      return res.status(400).json({ message: 'Ya habías aceptado este contrato' });
    }

    if (participant.signing_status === 'REJECTED') {
      return res.status(400).json({ message: 'Ya habías rechazado este contrato' });
    }

    // Actualizar estado del participante a ACCEPTED
    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('user_id', sql.UniqueIdentifier, user.userId)
      .input('signing_status', sql.NVarChar, 'ACCEPTED')
      .query(`
        UPDATE dbo.contract_participants
        SET signing_status = @signing_status,
            signed_at = SYSDATETIME()
        WHERE contract_id = @contract_id
          AND user_id = @user_id;
      `);

    // Registrar evento de aceptación
    const metadata = `Usuario ${user.email} aceptó el contrato`;
    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('event_type', sql.NVarChar, 'PARTICIPANT_ACCEPTED')
      .input('triggered_by_user_id', sql.UniqueIdentifier, user.userId)
      .input('metadata', sql.NVarChar, metadata)
      .query(`
        INSERT INTO dbo.contract_events (
          contract_id, event_type, triggered_by_user_id, metadata
        )
        VALUES (
          @contract_id, @event_type, @triggered_by_user_id, @metadata
        );
      `);

    // Verificar si todos los participantes (no CREATOR) aceptaron
    const totalParticipantsResult = await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .query(`
        SELECT COUNT(*) AS total
        FROM dbo.contract_participants
        WHERE contract_id = @contract_id
          AND role_in_contract <> 'CREATOR';
      `);

    const acceptedParticipantsResult = await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .query(`
        SELECT COUNT(*) AS accepted
        FROM dbo.contract_participants
        WHERE contract_id = @contract_id
          AND role_in_contract <> 'CREATOR'
          AND signing_status = 'ACCEPTED';
      `);

    const total = totalParticipantsResult.recordset[0].total;
    const accepted = acceptedParticipantsResult.recordset[0].accepted;

    // Si hay participantes y todos aceptaron -> contrato ACTIVE y se registra on-chain
    if (total > 0 && total === accepted) {
      // 1) Actualizar estado a ACTIVE en la BD
      await pool
        .request()
        .input('contract_id', sql.UniqueIdentifier, id)
        .input('status', sql.NVarChar, 'ACTIVE')
        .query(`
          UPDATE dbo.contracts
          SET status = @status,
              updated_at = SYSDATETIME()
          WHERE id = @contract_id;
        `);

      // 2) Registrar evento de activación en la BD
      await pool
        .request()
        .input('contract_id', sql.UniqueIdentifier, id)
        .input('event_type', sql.NVarChar, 'CONTRACT_ACTIVATED')
        .input('triggered_by_user_id', sql.UniqueIdentifier, user.userId)
        .input('metadata', sql.NVarChar, 'Todos los participantes aceptaron')
        .query(`
          INSERT INTO dbo.contract_events (
            contract_id, event_type, triggered_by_user_id, metadata
          )
          VALUES (
            @contract_id, @event_type, @triggered_by_user_id, @metadata
          );
        `);

      // 3) Intentar registrar el contrato en la blockchain
      try {
        const onChainResult = await registerContractOnChain({
          contractId: contract.id,
          title: contract.title,
          totalValue: contract.total_value,
          currency: contract.currency
        });

        // 4) Actualizar campos on-chain en la BD
        await pool
          .request()
          .input('contract_id', sql.UniqueIdentifier, id)
          .input(
            'smart_contract_address',
            sql.NVarChar,
            process.env.CONTRACTS_MANAGER_ADDRESS || null
          )
          .input(
            'blockchain_network',
            sql.NVarChar,
            process.env.BLOCKCHAIN_NETWORK || 'hardhat-local'
          )
          .input('on_chain', sql.Bit, 1)
          .query(`
            UPDATE dbo.contracts
            SET smart_contract_address = @smart_contract_address,
                blockchain_network = @blockchain_network,
                on_chain = @on_chain,
                updated_at = SYSDATETIME()
            WHERE id = @contract_id;
          `);

        // 5) Guardar evento de registro on-chain
        const metadataOnChain = `Registro en blockchain: txHash=${onChainResult.txHash}, network=${onChainResult.network}, manager=${onChainResult.managerAddress}`;

        await pool
          .request()
          .input('contract_id', sql.UniqueIdentifier, id)
          .input('event_type', sql.NVarChar, 'ONCHAIN_REGISTERED')
          .input('triggered_by_user_id', sql.UniqueIdentifier, user.userId)
          .input('metadata', sql.NVarChar, metadataOnChain)
          .query(`
            INSERT INTO dbo.contract_events (
              contract_id, event_type, triggered_by_user_id, metadata
            )
            VALUES (
              @contract_id, @event_type, @triggered_by_user_id, @metadata
            );
          `);
      } catch (err) {
        console.error('Error registrando contrato en blockchain:', err);
        // No lanzamos error al usuario: el contrato queda ACTIVE en la BD,
        // pero on_chain permanece en 0 (solo se pone en 1 si todo sale bien).
      }
    }

    return res.json({ message: 'Has aceptado el contrato' });
  } catch (error) {
    console.error('Error en POST /contracts/:id/accept:', error);
    return res.status(500).json({ message: 'Error interno al aceptar contrato' });
  }
});

/**
 * POST /contracts/:id/reject
 * La contraparte rechaza el contrato. El contrato pasa a estado REJECTED.
 */
/**
 * @openapi
 * /contracts/{id}/reject:
 *   post:
 *     tags:
 *       - Contracts
 *     summary: Rechaza el contrato como participante.
 *     description: Solo usuarios participantes distintos del creador pueden rechazar. El contrato pasa a estado REJECTED.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del contrato (GUID).
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contrato rechazado correctamente.
 *       400:
 *         description: Estado del contrato no válido o ya había sido rechazado.
 *       401:
 *         description: No autenticado.
 *       403:
 *         description: El usuario no es participante del contrato.
 *       404:
 *         description: Contrato no encontrado.
 */

router.post('/:id/reject', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  try {
    const pool = await getConnection();

    const contractResult = await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .query(`
        SELECT id, status
        FROM dbo.contracts
        WHERE id = @contract_id;
      `);

    if (contractResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Contrato no encontrado' });
    }

    const contract = contractResult.recordset[0];

    if (contract.status !== 'IN_REVIEW') {
      return res.status(400).json({ message: 'Solo se pueden rechazar contratos en IN_REVIEW' });
    }

    // Verificar participante
    const participantResult = await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('user_id', sql.UniqueIdentifier, user.userId)
      .query(`
        SELECT role_in_contract, signing_status
        FROM dbo.contract_participants
        WHERE contract_id = @contract_id
          AND user_id = @user_id;
      `);

    if (participantResult.recordset.length === 0) {
      return res.status(403).json({ message: 'No eres participante de este contrato' });
    }

    const participant = participantResult.recordset[0];

    if (participant.role_in_contract === 'CREATOR') {
      return res.status(400).json({ message: 'El creador no rechaza el contrato, puede cancelarlo' });
    }

    if (participant.signing_status === 'REJECTED') {
      return res.status(400).json({ message: 'Ya habías rechazado este contrato' });
    }

    // Actualizar participante a REJECTED
    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('user_id', sql.UniqueIdentifier, user.userId)
      .input('signing_status', sql.NVarChar, 'REJECTED')
      .query(`
        UPDATE dbo.contract_participants
        SET signing_status = @signing_status,
            signed_at = SYSDATETIME()
        WHERE contract_id = @contract_id
          AND user_id = @user_id;
      `);

    // Contrato pasa a estado REJECTED
    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, 'REJECTED')
      .query(`
        UPDATE dbo.contracts
        SET status = @status,
            updated_at = SYSDATETIME()
        WHERE id = @contract_id;
      `);

    const metadata = `Usuario ${user.email} rechazó el contrato`;
    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('event_type', sql.NVarChar, 'PARTICIPANT_REJECTED')
      .input('triggered_by_user_id', sql.UniqueIdentifier, user.userId)
      .input('metadata', sql.NVarChar, metadata)
      .query(`
        INSERT INTO dbo.contract_events (
          contract_id, event_type, triggered_by_user_id, metadata
        )
        VALUES (
          @contract_id, @event_type, @triggered_by_user_id, @metadata
        );
      `);

    return res.json({ message: 'Has rechazado el contrato' });
  } catch (error) {
    console.error('Error en POST /contracts/:id/reject:', error);
    return res.status(500).json({ message: 'Error interno al rechazar contrato' });
  }
});

/**
 * POST /contracts/:id/complete
 * El dueño marca el contrato como COMPLETED.
 */
/**
 * @openapi
 * /contracts/{id}/complete:
 *   post:
 *     tags:
 *       - Contracts
 *     summary: Marca el contrato como COMPLETED.
 *     description: Solo el usuario dueño del contrato puede marcarlo como COMPLETED, y solo si está en estado ACTIVE.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del contrato (GUID).
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contrato marcado como COMPLETED.
 *       400:
 *         description: El contrato no está en estado ACTIVE.
 *       401:
 *         description: No autenticado.
 *       404:
 *         description: Contrato no encontrado o no eres el dueño.
 */

router.post('/:id/complete', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  try {
    const pool = await getConnection();

    const contractResult = await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('owner_user_id', sql.UniqueIdentifier, user.userId)
      .query(`
        SELECT id, status
        FROM dbo.contracts
        WHERE id = @contract_id
          AND owner_user_id = @owner_user_id;
      `);

    if (contractResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Contrato no encontrado o no eres el dueño' });
    }

    const contract = contractResult.recordset[0];

    if (contract.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Solo los contratos ACTIVE pueden completarse' });
    }

    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, 'COMPLETED')
      .query(`
        UPDATE dbo.contracts
        SET status = @status,
            updated_at = SYSDATETIME()
        WHERE id = @contract_id;
      `);

    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('event_type', sql.NVarChar, 'CONTRACT_COMPLETED')
      .input('triggered_by_user_id', sql.UniqueIdentifier, user.userId)
      .input('metadata', sql.NVarChar, null)
      .query(`
        INSERT INTO dbo.contract_events (
          contract_id, event_type, triggered_by_user_id, metadata
        )
        VALUES (
          @contract_id, @event_type, @triggered_by_user_id, @metadata
        );
      `);

    return res.json({ message: 'Contrato marcado como COMPLETED' });
  } catch (error) {
    console.error('Error en POST /contracts/:id/complete:', error);
    return res.status(500).json({ message: 'Error interno al completar contrato' });
  }
});

/**
 * POST /contracts/:id/cancel
 * El dueño cancela el contrato: pasa a estado CANCELLED.
 */
/**
 * @openapi
 * /contracts/{id}/cancel:
 *   post:
 *     tags:
 *       - Contracts
 *     summary: Cancela el contrato.
 *     description: Solo el usuario dueño del contrato puede cancelarlo. Aplica para estados DRAFT, IN_REVIEW o ACTIVE.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del contrato (GUID).
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Contrato cancelado correctamente.
 *       400:
 *         description: Estado del contrato no permite cancelación.
 *       401:
 *         description: No autenticado.
 *       404:
 *         description: Contrato no encontrado o no eres el dueño.
 */

router.post('/:id/cancel', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  try {
    const pool = await getConnection();

    const contractResult = await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('owner_user_id', sql.UniqueIdentifier, user.userId)
      .query(`
        SELECT id, status
        FROM dbo.contracts
        WHERE id = @contract_id
          AND owner_user_id = @owner_user_id;
      `);

    if (contractResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Contrato no encontrado o no eres el dueño' });
    }

    const contract = contractResult.recordset[0];

    if (!['DRAFT', 'IN_REVIEW', 'ACTIVE'].includes(contract.status)) {
      return res.status(400).json({ message: 'Solo contratos DRAFT, IN_REVIEW o ACTIVE pueden cancelarse' });
    }

    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, 'CANCELLED')
      .query(`
        UPDATE dbo.contracts
        SET status = @status,
            updated_at = SYSDATETIME()
        WHERE id = @contract_id;
      `);

    await pool
      .request()
      .input('contract_id', sql.UniqueIdentifier, id)
      .input('event_type', sql.NVarChar, 'CONTRACT_CANCELLED')
      .input('triggered_by_user_id', sql.UniqueIdentifier, user.userId)
      .input('metadata', sql.NVarChar, null)
      .query(`
        INSERT INTO dbo.contract_events (
          contract_id, event_type, triggered_by_user_id, metadata
        )
        VALUES (
          @contract_id, @event_type, @triggered_by_user_id, @metadata
        );
      `);

    return res.json({ message: 'Contrato cancelado correctamente' });
  } catch (error) {
    console.error('Error en POST /contracts/:id/cancel:', error);
    return res.status(500).json({ message: 'Error interno al cancelar contrato' });
  }
});


export default router;
