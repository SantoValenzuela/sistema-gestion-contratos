// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ContractsManager - Registro on-chain de contratos creados en el backend
/// @notice Este contrato almacena un "espejo" básico de los contratos de la base de datos.
contract ContractsManager {
    enum Status {
        Draft,
        InReview,
        Active,
        Rejected,
        Completed,
        Cancelled
    }

    struct ContractData {
        bytes32 backendId;   // ID del contrato en la BD (GUID hasheado o similar)
        address owner;       // Dirección que registró el contrato en la blockchain
        Status status;       // Estado en la blockchain
        string title;        // Título del contrato
        uint256 totalValue;  // Monto asociado (opcional)
        string currency;     // Moneda (ej: "USD")
        uint256 createdAt;   // Marca de tiempo on-chain
    }

    uint256 public nextId;
    mapping(uint256 => ContractData) public contractsByOnChainId;
    mapping(bytes32 => uint256) public onChainIdByBackendId;

    event ContractRegistered(
        uint256 indexed onChainId,
        bytes32 indexed backendId,
        address indexed owner
    );

    event ContractStatusUpdated(
        uint256 indexed onChainId,
        Status status
    );

    function registerContract(
        bytes32 backendId,
        string memory title,
        uint256 totalValue,
        string memory currency
    ) external returns (uint256 onChainId) {
        require(backendId != bytes32(0), "backendId invalido");
        require(onChainIdByBackendId[backendId] == 0, "Contrato ya registrado");

        nextId += 1;
        onChainId = nextId;

        contractsByOnChainId[onChainId] = ContractData({
            backendId: backendId,
            owner: msg.sender,
            status: Status.Active,
            title: title,
            totalValue: totalValue,
            currency: currency,
            createdAt: block.timestamp
        });

        onChainIdByBackendId[backendId] = onChainId;

        emit ContractRegistered(onChainId, backendId, msg.sender);
        emit ContractStatusUpdated(onChainId, Status.Active);
    }

    function updateStatus(uint256 onChainId, Status newStatus) external {
        ContractData storage data = contractsByOnChainId[onChainId];
        require(data.owner != address(0), "Contrato no encontrado");
        require(msg.sender == data.owner, "Solo el duenio puede actualizar");

        data.status = newStatus;
        emit ContractStatusUpdated(onChainId, newStatus);
    }

    function isRegistered(bytes32 backendId) external view returns (bool) {
        return onChainIdByBackendId[backendId] != 0;
    }
}
