import { network } from "hardhat";

// Hardhat 3: usamos network.connect() para obtener ethers y el nombre de la red
const { ethers, networkName } = await network.connect();

console.log(`Desplegando ContractsManager en ${networkName}...`);

const contractsManager = await ethers.deployContract("ContractsManager");

console.log("Esperando confirmación de la transacción de deploy...");
await contractsManager.waitForDeployment();

const address = await contractsManager.getAddress();
console.log("✅ ContractsManager desplegado en:", address);
