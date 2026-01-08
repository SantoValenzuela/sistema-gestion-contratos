import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Cargamos el artefacto compilado de Hardhat (ABI)
const ContractsManagerArtifact = require('../../../blockchain/artifacts/contracts/ContractsManager.sol/ContractsManager.json');

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY;
const CONTRACTS_MANAGER_ADDRESS = process.env.CONTRACTS_MANAGER_ADDRESS;
const BLOCKCHAIN_NETWORK = process.env.BLOCKCHAIN_NETWORK || 'hardhat-local';

if (!PRIVATE_KEY || !CONTRACTS_MANAGER_ADDRESS) {
  console.warn(
    '[blockchainService] Falta BLOCKCHAIN_PRIVATE_KEY o CONTRACTS_MANAGER_ADDRESS en .env. ' +
      'Las operaciones on-chain fallarán hasta configurarlo.'
  );
}

function getContractsManager() {
  if (!PRIVATE_KEY || !CONTRACTS_MANAGER_ADDRESS) {
    throw new Error('Configuración de blockchain incompleta');
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const contract = new ethers.Contract(
    CONTRACTS_MANAGER_ADDRESS,
    ContractsManagerArtifact.abi,
    wallet
  );

  return contract;
}

/**
 * Registra el contrato en la blockchain usando ContractsManager.registerContract
 * Devuelve el hash de la transacción (txHash) por si queremos loguearlo.
 */
export async function registerContractOnChain(params: {
  contractId: string;            // GUID en la BD
  title: string;
  totalValue?: number | null;
  currency?: string | null;
}): Promise<{ txHash: string; network: string; managerAddress: string }> {
  const cm = getContractsManager();

  // Usamos un hash del ID de la BD como bytes32
  const backendIdBytes32 = ethers.id(params.contractId);

  const totalValue =
    params.totalValue !== undefined && params.totalValue !== null
      ? params.totalValue
      : 0;

  const currency = params.currency || '';

  const tx = await cm.registerContract(
    backendIdBytes32,
    params.title,
    totalValue,
    currency
  );

  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    network: BLOCKCHAIN_NETWORK,
    managerAddress: CONTRACTS_MANAGER_ADDRESS as string
  };
}

export async function getOnChainContractByBackendId(contractId: string) {
  const cm = getContractsManager();

  // Mismo backendId que usamos al registrar: hash del GUID
  const backendIdBytes32 = ethers.id(contractId);

  const onChainId: bigint = await cm.onChainIdByBackendId(backendIdBytes32);

  // Si es 0, en nuestro contrato significa "no registrado"
  if (onChainId === 0n) {
    return {
      registered: false,
      network: BLOCKCHAIN_NETWORK,
      managerAddress: CONTRACTS_MANAGER_ADDRESS as string
    };
  }

  const data: any = await cm.contractsByOnChainId(onChainId);

  const statusIndex = Number(data.status ?? data[2] ?? 0);
  const statusMap = ['Draft', 'InReview', 'Active', 'Rejected', 'Completed', 'Cancelled'];

  const totalValueBigInt = (data.totalValue ?? data[4] ?? 0n) as bigint;
  const createdAtBigInt = (data.createdAt ?? data[6] ?? 0n) as bigint;

  return {
    registered: true,
    onChainId: onChainId.toString(),
    backendId: (data.backendId ?? data[0]) as string,
    owner: (data.owner ?? data[1]) as string,
    status: statusMap[statusIndex] ?? statusIndex.toString(),
    title: (data.title ?? data[3]) as string,
    totalValue: totalValueBigInt.toString(),
    currency: (data.currency ?? data[5]) as string,
    createdAt: Number(createdAtBigInt),
    network: BLOCKCHAIN_NETWORK,
    managerAddress: CONTRACTS_MANAGER_ADDRESS as string
  };
}
