-- CreateTable
CREATE TABLE "Mesa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "capacidade" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'livre',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bracelet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'QR',
    "status" TEXT NOT NULL DEFAULT 'livre',
    "blockedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Bracelet" ("blockedReason", "createdAt", "id", "number", "status", "type", "updatedAt") SELECT "blockedReason", "createdAt", "id", "number", "status", "type", "updatedAt" FROM "Bracelet";
DROP TABLE "Bracelet";
ALTER TABLE "new_Bracelet" RENAME TO "Bracelet";
CREATE UNIQUE INDEX "Bracelet_number_key" ON "Bracelet"("number");
CREATE TABLE "new_CashMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "formaPagamento" TEXT NOT NULL DEFAULT 'dinheiro',
    "amount" DECIMAL NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_CashMovement" ("amount", "createdAt", "description", "id", "type") SELECT "amount", "createdAt", "description", "id", "type" FROM "CashMovement";
DROP TABLE "CashMovement";
ALTER TABLE "new_CashMovement" RENAME TO "CashMovement";
CREATE TABLE "new_Comanda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mesaId" TEXT,
    "braceletId" TEXT,
    "clientId" TEXT,
    "eventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aberta',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "canceladaEm" DATETIME,
    "motivoCancelamento" TEXT,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "desconto" DECIMAL NOT NULL DEFAULT 0,
    "formaPagamento" TEXT,
    "clienteNome" TEXT NOT NULL DEFAULT '',
    "clienteCpf" TEXT NOT NULL DEFAULT '',
    "clienteTelefone" TEXT NOT NULL DEFAULT '',
    "clienteEmail" TEXT NOT NULL DEFAULT '',
    "clienteNascimento" DATETIME,
    CONSTRAINT "Comanda_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comanda_braceletId_fkey" FOREIGN KEY ("braceletId") REFERENCES "Bracelet" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comanda_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comanda_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Comanda" ("braceletId", "clientId", "clienteCpf", "clienteEmail", "clienteNascimento", "clienteNome", "clienteTelefone", "closedAt", "eventId", "id", "openedAt", "status", "total") SELECT "braceletId", "clientId", "clienteCpf", "clienteEmail", "clienteNascimento", "clienteNome", "clienteTelefone", "closedAt", "eventId", "id", "openedAt", "status", "total" FROM "Comanda";
DROP TABLE "Comanda";
ALTER TABLE "new_Comanda" RENAME TO "Comanda";
CREATE TABLE "new_Pedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comandaId" TEXT NOT NULL,
    "produtoId" TEXT,
    "nome" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorUnitario" DECIMAL NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    "observacao" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "cancelado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pedido_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pedido" ("cancelado", "comandaId", "createdAt", "id", "nome", "produtoId", "quantidade", "subtotal", "valorUnitario") SELECT "cancelado", "comandaId", "createdAt", "id", "nome", "produtoId", "quantidade", "subtotal", "valorUnitario" FROM "Pedido";
DROP TABLE "Pedido";
ALTER TABLE "new_Pedido" RENAME TO "Pedido";
CREATE TABLE "new_Produto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'Geral',
    "categoriaId" TEXT,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "estoque" INTEGER NOT NULL DEFAULT 0,
    "estoqueMinimo" INTEGER NOT NULL DEFAULT 5,
    "imagemUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Produto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Produto" ("ativo", "categoria", "createdAt", "estoque", "id", "nome", "preco", "updatedAt") SELECT "ativo", "categoria", "createdAt", "estoque", "id", "nome", "preco", "updatedAt" FROM "Produto";
DROP TABLE "Produto";
ALTER TABLE "new_Produto" RENAME TO "Produto";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'administrador',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("active", "createdAt", "email", "id", "name", "password", "role", "updatedAt") SELECT "active", "createdAt", "email", "id", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_numero_key" ON "Mesa"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nome_key" ON "Categoria"("nome");
