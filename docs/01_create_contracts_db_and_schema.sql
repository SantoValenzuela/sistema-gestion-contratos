------------------------------------------------------------
-- Script de creación de base de datos y esquema
-- Sistema de Gestión de Contratos con Blockchain
-- Base: contracts_db
------------------------------------------------------------

-- 1. Crear base de datos (si no existe)
USE [master];
GO

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'contracts_db')
BEGIN
    CREATE DATABASE [contracts_db];
END
GO

-- 2. Crear login y usuario para el sistema (si no existen)
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'contracts_user')
BEGIN
    CREATE LOGIN [contracts_user] WITH PASSWORD = 'ContraseñaSegura123!';
END
GO

USE [contracts_db];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'contracts_user')
BEGIN
    CREATE USER [contracts_user] FOR LOGIN [contracts_user] WITH DEFAULT_SCHEMA = [dbo];
    ALTER ROLE [db_owner] ADD MEMBER [contracts_user];
END
GO

------------------------------------------------------------
-- 3. Tablas
------------------------------------------------------------

-- Tabla: users
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[users](
        [id] [uniqueidentifier] NOT NULL,
         NOT NULL,
         NOT NULL,
         NOT NULL,
         NOT NULL,
         NOT NULL,
        :contentReference[oaicite:5]{index=5} NOT NULL,
        :contentReference[oaicite:6]{index=6} NOT NULL,
        CONSTRAINT [PK_users] PRIMARY KEY CLUSTERED 
        (
            [id] ASC
        ) WITH (
            PAD_INDEX = OFF, 
            STATISTICS_NORECOMPUTE = OFF, 
            IGNORE_DUP_KEY = OFF, 
            ALLOW_ROW_LOCKS = ON, 
            ALLOW_PAGE_LOCKS = ON, 
            OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF
        ) ON [PRIMARY],
        CONSTRAINT [UQ_users_email] UNIQUE NONCLUSTERED 
        (
            [email] ASC
        ) WITH (
            PAD_INDEX = OFF, 
            STATISTICS_NORECOMPUTE = OFF, 
            IGNORE_DUP_KEY = OFF, 
            ALLOW_ROW_LOCKS = ON, 
            ALLOW_PAGE_LOCKS = ON, 
            OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF
        ) ON [PRIMARY]
    ) ON [PRIMARY];
END
GO

-- Tabla: contracts
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.contracts', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[contracts](
        [id] [uniqueidentifier] NOT NULL,
         NOT NULL,
        [description] [nvarchar](max) NULL,
        [owner_user_id] [uniqueidentifier] NOT NULL,
         NOT NULL,
        [total_value] [decimal](18, 2) NULL,
         NULL,
        [effective_date] [date] NULL,
        [termination_date] [date] NULL,
         NULL,
         NULL,
        [on_chain] [bit] NOT NULL,
        :contentReference[oaicite:12]{index=12} NOT NULL,
        :contentReference[oaicite:13]{index=13} NOT NULL,
        CONSTRAINT [PK_contracts] PRIMARY KEY CLUSTERED 
        (
            [id] ASC
        ) WITH (
            PAD_INDEX = OFF, 
            STATISTICS_NORECOMPUTE = OFF, 
            IGNORE_DUP_KEY = OFF, 
            ALLOW_ROW_LOCKS = ON, 
            ALLOW_PAGE_LOCKS = ON, 
            OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF
        ) ON [PRIMARY]
    ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY];
END
GO

-- Tabla: contract_participants
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.contract_participants', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[contract_participants](
        [contract_id] [uniqueidentifier] NOT NULL,
        [user_id] [uniqueidentifier] NOT NULL,
         NOT NULL,
         NOT NULL,
        :contentReference[oaicite:16]{index=16} NULL,
        :contentReference[oaicite:17]{index=17} NOT NULL,
        CONSTRAINT [PK_contract_participants] PRIMARY KEY CLUSTERED 
        (
            [contract_id] ASC,
            [user_id] ASC
        ) WITH (
            PAD_INDEX = OFF, 
            STATISTICS_NORECOMPUTE = OFF, 
            IGNORE_DUP_KEY = OFF, 
            ALLOW_ROW_LOCKS = ON, 
            ALLOW_PAGE_LOCKS = ON, 
            OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF
        ) ON [PRIMARY]
    ) ON [PRIMARY];
END
GO

-- Tabla: contract_events
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.contract_events', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[contract_events](
        [id] [uniqueidentifier] NOT NULL,
        [contract_id] [uniqueidentifier] NOT NULL,
         NOT NULL,
        [triggered_by_user_id] [uniqueidentifier] NULL,
        [metadata] [nvarchar](max) NULL,
        :contentReference[oaicite:19]{index=19} NOT NULL,
        CONSTRAINT [PK_contract_events] PRIMARY KEY CLUSTERED 
        (
            [id] ASC
        ) WITH (
            PAD_INDEX = OFF, 
            STATISTICS_NORECOMPUTE = OFF, 
            IGNORE_DUP_KEY = OFF, 
            ALLOW_ROW_LOCKS = ON, 
            ALLOW_PAGE_LOCKS = ON, 
            OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF
        ) ON [PRIMARY]
    ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY];
END
GO

------------------------------------------------------------
-- 4. Índices
------------------------------------------------------------

-- Índice para contract_events.contract_id
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = N'IX_ce_contract' AND object_id = OBJECT_ID(N'dbo.contract_events')
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ce_contract] ON [dbo].[contract_events]
    (
        [contract_id] ASC
    ) WITH (
        PAD_INDEX = OFF, 
        STATISTICS_NORECOMPUTE = OFF, 
        SORT_IN_TEMPDB = OFF, 
        DROP_EXISTING = OFF, 
        ONLINE = OFF, 
        ALLOW_ROW_LOCKS = ON, 
        ALLOW_PAGE_LOCKS = ON, 
        OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF
    ) ON [PRIMARY];
END
GO

-- Índice para contract_participants.user_id
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = N'IX_cp_user' AND object_id = OBJECT_ID(N'dbo.contract_participants')
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_cp_user] ON [dbo].[contract_participants]
    (
        [user_id] ASC
    ) WITH (
        PAD_INDEX = OFF, 
        STATISTICS_NORECOMPUTE = OFF, 
        SORT_IN_TEMPDB = OFF, 
        DROP_EXISTING = OFF, 
        ONLINE = OFF, 
        ALLOW_ROW_LOCKS = ON, 
        ALLOW_PAGE_LOCKS = ON, 
        OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF
    ) ON [PRIMARY];
END
GO

------------------------------------------------------------
-- 5. Defaults
------------------------------------------------------------

-- Defaults en contract_events
IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints 
    WHERE name = N'DF_contract_events_id'
)
BEGIN
    ALTER TABLE [dbo].[contract_events] 
    ADD CONSTRAINT [DF_contract_events_id] DEFAULT (NEWID()) FOR [id];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints 
    WHERE name = N'DF_contract_events_created_at'
)
BEGIN
    ALTER TABLE [dbo].[contract_events] 
    ADD CONSTRAINT [DF_contract_events_created_at] DEFAULT (SYSDATETIME()) FOR [created_at];
END
GO

-- Defaults en contract_participants
IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints 
    WHERE name = N'DF_contract_participants_signing_status'
)
BEGIN
    ALTER TABLE [dbo].[contract_participants] 
    ADD CONSTRAINT [DF_contract_participants_signing_status] DEFAULT ('PENDING') FOR [signing_status];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints 
    WHERE name = N'DF_contract_participants_created_at'
)
BEGIN
    ALTER TABLE [dbo].[contract_participants] 
    ADD CONSTRAINT [DF_contract_participants_created_at] DEFAULT (SYSDATETIME()) FOR [created_at];
END
GO

-- Defaults en contracts
IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints 
    WHERE name = N'DF_contracts_id'
)
BEGIN
    ALTER TABLE [dbo].[contracts] 
    ADD CONSTRAINT [DF_contracts_id] DEFAULT (NEWID()) FOR [id];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints 
    WHERE name = N'DF_contracts_status'
)
BEGIN
    ALTER TABLE [dbo].[contracts] 
    ADD CONSTRAINT [DF_contracts_status] DEFAULT ('DRAFT') FOR [status];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints 
    WHERE name = N'DF_contracts_on_chain'
)
BEGIN
    ALTER TABLE [dbo].[contracts] 
    ADD CONSTRAINT [DF_contracts_on_chain] DEFAULT ((0)) FOR [on_chain];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints 
    WHERE name = N'DF_contracts_created_at'
)
BEGIN
    ALTER TABLE [dbo].[contracts] 
    ADD CONSTRAINT [DF_contracts_created_at] DEFAULT (SYSDATETIME()) FOR [created_at];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints 
    WHERE name = N'DF_contracts_updated_at'
)
BEGIN
    ALTER TABLE [dbo].[contracts] 
    ADD CONSTRAINT [DF_contracts_updated_at] DEFAULT (SYSDATETIME()) FOR [updated_at];
END
GO

-- Defaults en users
IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints 
    WHERE name = N'DF_users_id'
)
BEGIN
    ALTER TABLE [dbo].[users] 
    ADD CONSTRAINT [DF_users_id] DEFAULT (NEWID()) FOR [id];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints 
    WHERE name = N'DF_users_status'
)
BEGIN
    ALTER TABLE [dbo].[users] 
    ADD CONSTRAINT [DF_users_status] DEFAULT ('ACTIVE') FOR [status];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints 
    WHERE name = N'DF_users_created_at'
)
BEGIN
    ALTER TABLE [dbo].[users] 
    ADD CONSTRAINT [DF_users_created_at] DEFAULT (SYSDATETIME()) FOR [created_at];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints 
    WHERE name = N'DF_users_updated_at'
)
BEGIN
    ALTER TABLE [dbo].[users] 
    ADD CONSTRAINT [DF_users_updated_at] DEFAULT (SYSDATETIME()) FOR [updated_at];
END
GO

------------------------------------------------------------
-- 6. Claves foráneas
------------------------------------------------------------

-- FK contract_events.contract_id -> contracts.id
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = N'FK_ce_contract'
)
BEGIN
    ALTER TABLE [dbo].[contract_events] WITH CHECK 
    ADD CONSTRAINT [FK_ce_contract] FOREIGN KEY([contract_id])
    REFERENCES [dbo].[contracts] ([id]);

    ALTER TABLE [dbo].[contract_events] CHECK CONSTRAINT [FK_ce_contract];
END
GO

-- FK contract_events.triggered_by_user_id -> users.id
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = N'FK_ce_user'
)
BEGIN
    ALTER TABLE [dbo].[contract_events] WITH CHECK 
    ADD CONSTRAINT [FK_ce_user] FOREIGN KEY([triggered_by_user_id])
    REFERENCES [dbo].[users] ([id]);

    ALTER TABLE [dbo].[contract_events] CHECK CONSTRAINT [FK_ce_user];
END
GO

-- FK contract_participants.contract_id -> contracts.id
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = N'FK_cp_contract'
)
BEGIN
    ALTER TABLE [dbo].[contract_participants] WITH CHECK 
    ADD CONSTRAINT [FK_cp_contract] FOREIGN KEY([contract_id])
    REFERENCES [dbo].[contracts] ([id]);

    ALTER TABLE [dbo].[contract_participants] CHECK CONSTRAINT [FK_cp_contract];
END
GO

-- FK contract_participants.user_id -> users.id
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = N'FK_cp_user'
)
BEGIN
    ALTER TABLE [dbo].[contract_participants] WITH CHECK 
    ADD CONSTRAINT [FK_cp_user] FOREIGN KEY([user_id])
    REFERENCES [dbo].[users] ([id]);

    ALTER TABLE [dbo].[contract_participants] CHECK CONSTRAINT [FK_cp_user];
END
GO

-- FK contracts.owner_user_id -> users.id
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = N'FK_contracts_owner'
)
BEGIN
    ALTER TABLE [dbo].[contracts] WITH CHECK 
    ADD CONSTRAINT [FK_contracts_owner] FOREIGN KEY([owner_user_id])
    REFERENCES [dbo].[users] ([id]);

    ALTER TABLE [dbo].[contracts] CHECK CONSTRAINT [FK_contracts_owner];
END
GO
