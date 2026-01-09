¡
# Sistema de Gestión de Contratos con Integración Blockchain

Este proyecto implementa una aplicación web para la gestión de contratos digitales y su registro como "contratos inteligentes" en una red blockchain local.

Incluye:

- **Backend (API REST)**: Node.js + TypeScript + Express + SQL Server  
- **Capa Blockchain**: Solidity + Hardhat + ethers.js  
- **Frontend (SPA)**: React + TypeScript + Vite

---

## 1. Arquitectura general

- **Frontend** (`/frontend`):
  - Aplicación React + TypeScript
  - Single Page Application (SPA) creada con Vite
  - Manejo de rutas con `react-router-dom`
  - Consumo de la API con `axios`

- **Backend** (`/backend`):
  - Node.js + Express + TypeScript
  - Conexión a SQL Server mediante la librería `mssql`
  - Autenticación con JWT
  - Documentación de endpoints con Swagger (`/docs`)

- **Blockchain** (`/blockchain`):
  - Smart contract `ContractsManager` escrito en Solidity
  - Framework Hardhat (compilación, despliegue y red local)
  - Integración con el backend a través de `ethers.js`

---

## 2. Requisitos previos

- Git  
- Node.js 18+  
- SQL Server (local)  
- SQL Server Management Studio (recomendado)  

---

## 3. Clonar el repositorio

```bash
git clone https://github.com/SantoValenzuela/sistema-gestion-contratos.git
cd sistema-gestion-contratos

4. Base de datos (SQL Server)

Crear la base de datos, por ejemplo:

CREATE DATABASE ContractsDB;
GO


Ejecutar el script SQL ubicado en docs/sql/ sobre ContractsDB para crear las tablas necesarias (users, contracts, contract_participants, contract_events, etc.).

(Opcional) Crear un usuario específico para el sistema:

CREATE LOGIN contracts_user WITH PASSWORD = 'ContraseñaSegura123!';
GO

USE ContractsDB;
CREATE USER contracts_user FOR LOGIN contracts_user;
ALTER ROLE db_owner ADD MEMBER contracts_user;
GO

5. Backend (API REST)
5.1 Instalación
cd backend
npm install

5.2 Configuración .env

En la carpeta /backend existe un .env (o .env.example) que se puede tomar como base.
Ejemplo de configuración:

PORT=3000

DB_SERVER=localhost
DB_DATABASE=ContractsDB
DB_USER=contracts_user
DB_PASSWORD=ContraseñaSegura123!
DB_ENCRYPT=false

JWT_SECRET=supersecreto
JWT_EXPIRATION=1d

HARDHAT_RPC_URL=http://127.0.0.1:8545
HARDHAT_DEPLOYER_PRIVATE_KEY=<clave privada de una cuenta de Hardhat>
BLOCKCHAIN_NETWORK=hardhat-local
CONTRACTS_MANAGER_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3


Ajustar los valores según la instalación local de SQL Server y la dirección del contrato desplegado (ver sección de blockchain).

5.3 Ejecutar el backend
npm run dev


La API queda disponible en:

http://localhost:3000

Documentación Swagger: http://localhost:3000/docs

6. Blockchain (Hardhat + Solidity)
6.1 Instalación
cd blockchain
npm install

6.2 Compilar contratos
npx hardhat compile

6.3 Levantar red local
npx hardhat node


La red local quedará en http://127.0.0.1:8545 y la consola mostrará varias cuentas con sus claves privadas.

6.4 Desplegar el smart contract

En otra terminal:

cd blockchain
npx hardhat run scripts/deploy.ts --network localhost


La salida mostrará la dirección del contrato ContractsManager, por ejemplo:

Desplegando ContractsManager en localhost...
✅ ContractsManager desplegado en: 0x5FbDB2315678afecb367f032d93F642f64180aa3


Copiar esta dirección en el .env del backend:

CONTRACTS_MANAGER_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3


Y establecer HARDHAT_DEPLOYER_PRIVATE_KEY con la clave privada de una de las cuentas de Hardhat.

7. Frontend (React + Vite)
7.1 Instalación
cd frontend
npm install

7.2 Configuración .env

Crear un archivo .env en /frontend (o usar el que ya existe como ejemplo):

VITE_API_BASE_URL=http://localhost:3000

7.3 Ejecutar el frontend
npm run dev


La aplicación web estará disponible en:

http://localhost:5173

8. Flujo de uso

Abrir el frontend en http://localhost:5173.

Registrar un usuario nuevo y luego iniciar sesión.

Crear un nuevo contrato desde la sección de “Mis contratos”.

Invitar contrapartes (otros usuarios registrados) desde el detalle del contrato.

Enviar el contrato a revisión.

Cada contraparte puede aceptar o rechazar el contrato.

Cuando todas las partes aceptan:

El backend marca el contrato como ACTIVE.

Se registra en blockchain mediante ContractsManager.

El detalle del contrato muestra la información on-chain (ID, estado, red, dirección del contrato gestor).

9. Notas finales

El proyecto está pensado para ejecutarse en entorno local (desarrollo) usando la red de Hardhat.

La integración con una testnet pública (por ejemplo Sepolia) requeriría únicamente ajustar el HARDHAT_RPC_URL, la clave privada y la configuración de despliegue del contrato.

El código sigue una arquitectura por capas, separando claramente:

interfaz de usuario (frontend),

lógica de negocio y acceso a datos (backend),

y registro inmutable en blockchain (smart contract).