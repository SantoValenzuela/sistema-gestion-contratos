# Sistema de Gestión de Contratos con Integración Blockchain

Este proyecto implementa una aplicación web para la gestión de contratos digitales y su registro como "contratos inteligentes" en una red blockchain local.

Incluye:

* **Backend (API REST)**: Node.js + TypeScript + Express + SQL Server
* **Capa Blockchain**: Solidity + Hardhat + ethers.js
* **Frontend (SPA)**: React + TypeScript + Vite

---

1. Arquitectura general

---

* **Frontend** (`/frontend`):

  * Aplicación React + TypeScript
  * Single Page Application (SPA) creada con Vite
  * Manejo de rutas con `react-router-dom`
  * Consumo de la API con `axios`

* **Backend** (`/backend`):

  * Node.js + Express + TypeScript
  * Conexión a SQL Server mediante la librería `mssql`
  * Autenticación con JWT
  * Documentación de endpoints con Swagger (`/docs`)

* **Blockchain** (`/blockchain`):

  * Smart contract `ContractsManager` escrito en Solidity
  * Framework Hardhat (compilación, despliegue y red local)
  * Integración con el backend a través de `ethers.js`

---

2. Requisitos previos

---

Para ejecutar el proyecto se recomienda tener instalado:

* Git
* Node.js 18 o superior
* SQL Server (instancia local)
* SQL Server Management Studio (SSMS) para ejecutar los scripts SQL

---

3. Clonar el repositorio

---

En una terminal:

```bash
git clone https://github.com/SantoValenzuela/sistema-gestion-contratos.git
cd sistema-gestion-contratos
```

Estructura principal:

* `backend/` – API REST y lógica de negocio
* `frontend/` – Interfaz web (React)
* `blockchain/` – Proyecto Hardhat y smart contract
* `docs/sql/` – Scripts SQL de creación de base de datos y tablas

---

4. Base de datos (SQL Server)

---

1. Abrir **SQL Server Management Studio (SSMS)**.

2. Ejecutar el script SQL de creación de base de datos y tablas ubicado en:

   * `docs/sql/01_create_contracts_db_and_schema.sql`
     (incluye `CREATE DATABASE contracts_db`, tablas, índices y restricciones).

   Ese script creará:

   * La base de datos **`contracts_db`**
   * Las tablas:

     * `users`
     * `contracts`
     * `contract_participants`
     * `contract_events`
   * El usuario de base de datos `contracts_user` con rol `db_owner` sobre `contracts_db` (asociado al login `contracts_user`).

3. En caso de que el login `contracts_user` no exista, el script lo creará automáticamente.

> Nota: el nombre de la base de datos que usa el sistema es **`contracts_db`**. Este nombre se referencia en el archivo `.env` del backend.

---

5. Backend (API REST)

---

### 5.1 Instalación

Desde la carpeta raíz del proyecto:

```bash
cd backend
npm install
```

### 5.2 Configuración `.env`

En la carpeta `/backend` ya existe un archivo `.env` que puede usarse como ejemplo o ajustarse directamente.
Debe contener, como mínimo, algo equivalente a:

```env
PORT=3000

DB_SERVER=localhost
DB_DATABASE=contracts_db
DB_USER=contracts_user
DB_PASSWORD=ContraseñaSegura123!
DB_ENCRYPT=false

JWT_SECRET=supersecreto
JWT_EXPIRATION=1d

HARDHAT_RPC_URL=http://127.0.0.1:8545
HARDHAT_DEPLOYER_PRIVATE_KEY=<clave privada de una cuenta de Hardhat>
BLOCKCHAIN_NETWORK=hardhat-local
CONTRACTS_MANAGER_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

* `DB_DATABASE` debe ser `contracts_db`.
* `DB_USER` y `DB_PASSWORD` deben coincidir con los definidos en SQL Server.
* Los parámetros de blockchain se rellenan después de desplegar el smart contract (ver sección 6).

### 5.3 Ejecutar el backend

```bash
npm run dev
```

La API estará disponible en:

* `http://localhost:3000`

Documentación Swagger (para probar endpoints):

* `http://localhost:3000/docs`

---

6. Blockchain (Hardhat + Solidity)

---

### 6.1 Instalación

```bash
cd blockchain
npm install
```

### 6.2 Compilar contratos (opcional, recomendado)

```bash
npx hardhat compile
```

### 6.3 Levantar la red local de Hardhat

```bash
npx hardhat node
```

Esto levanta una blockchain local en `http://127.0.0.1:8545` y muestra en consola varias cuentas de prueba con sus claves privadas.

### 6.4 Desplegar el smart contract

En otra terminal (dejando `npx hardhat node` corriendo):

```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network localhost
```

La salida mostrará algo como:

```text
Desplegando ContractsManager en localhost...
✅ ContractsManager desplegado en: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

* Copiar esa dirección y pegarla en el archivo `.env` del backend:

```env
CONTRACTS_MANAGER_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

* Para `HARDHAT_DEPLOYER_PRIVATE_KEY`, usar la clave privada de una de las cuentas que Hardhat muestra al ejecutar `npx hardhat node`.

---

7. Frontend (React + Vite)

---

### 7.1 Instalación

```bash
cd frontend
npm install
```

### 7.2 Configuración `.env` del frontend

En la carpeta `/frontend` se puede crear un archivo `.env` (si no existe), con al menos:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Esto indica que el frontend debe comunicarse con la API del backend en `http://localhost:3000`.

### 7.3 Ejecutar el frontend

```bash
npm run dev
```

La aplicación web estará disponible en:

```text
http://localhost:5173
```

---

8. Flujo de uso

---

Con **backend**, **blockchain** y **frontend** en ejecución:

1. Abrir el navegador en `http://localhost:5173`.
2. Registrar un nuevo usuario en la pantalla de registro.
3. Iniciar sesión con ese usuario.
4. Crear un contrato desde la sección “Mis contratos” utilizando el botón **“+ Nuevo contrato”**.
5. Desde el detalle del contrato:

   * Invitar a una contraparte introduciendo el correo de otro usuario registrado.
   * Enviar el contrato a revisión cuando esté listo.
6. Cada contraparte puede iniciar sesión y **aceptar o rechazar** el contrato.
7. Cuando todas las partes aceptan:

   * El backend marca el contrato como `ACTIVE` en SQL Server.
   * Registra el contrato en la blockchain usando el smart contract `ContractsManager`.
8. En el detalle del contrato, la sección **“Estado en blockchain”** muestra:

   * Si el contrato está registrado on-chain.
   * El ID on-chain.
   * La dirección del contrato gestor.
   * La red utilizada (`hardhat-local`).

Además, desde Swagger (`http://localhost:3000/docs`) se pueden probar directamente los endpoints de autenticación, contratos, participantes y consulta on-chain.

---

9. Notas finales

---

* El sistema está diseñado para ejecutarse en entorno local con la red de Hardhat.
* Para migrarlo a una testnet pública bastaría con ajustar la URL RPC, la clave privada y desplegar el smart contract en dicha red.
* La aplicación está dividida en capas claras:

  * **Frontend** (interfaz de usuario),
  * **Backend** (lógica de negocio + acceso a datos),
  * **Blockchain** (registro inmutable del contrato cuando se activa).

