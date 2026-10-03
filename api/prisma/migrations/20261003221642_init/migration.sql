-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('RAW', 'PRODUCT');

-- CreateEnum
CREATE TYPE "WarehouseKind" AS ENUM ('RAW', 'WIP', 'FINISHED');

-- CreateEnum
CREATE TYPE "StageKind" AS ENUM ('ASSEMBLY', 'TEST', 'QUALITY');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('RECEIPT', 'TRANSFER', 'CONSUME', 'PRODUCE');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('WAITING', 'IN_PROCESS', 'COMPLETED', 'SCRAPPED');

-- CreateEnum
CREATE TYPE "OperationResult" AS ENUM ('DONE', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "InspectionDecision" AS ENUM ('ACCEPT', 'REJECT');

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'ADET',
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "WarehouseKind" NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "kind" "StageKind" NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "stageId" INTEGER NOT NULL,
    "monthlySalary" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomLine" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "componentId" INTEGER NOT NULL,
    "stageId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "BomLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "warehouseId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("warehouseId","itemId")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" SERIAL NOT NULL,
    "type" "MovementType" NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "fromWarehouseId" INTEGER,
    "toWarehouseId" INTEGER,
    "workOrderId" INTEGER,
    "unitId" INTEGER,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" SERIAL NOT NULL,
    "no" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PLANNED',
    "dueDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionUnit" (
    "id" SERIAL NOT NULL,
    "serialNo" TEXT NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "currentStageId" INTEGER,
    "status" "UnitStatus" NOT NULL DEFAULT 'WAITING',
    "reworkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProductionUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" SERIAL NOT NULL,
    "unitId" INTEGER NOT NULL,
    "stageId" INTEGER NOT NULL,
    "workerId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "laborCost" DECIMAL(12,4),
    "result" "OperationResult",
    "note" TEXT,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" SERIAL NOT NULL,
    "unitId" INTEGER NOT NULL,
    "operationId" INTEGER NOT NULL,
    "kind" "StageKind" NOT NULL,
    "answers" JSONB NOT NULL,
    "measurements" JSONB,
    "decision" "InspectionDecision" NOT NULL,
    "inspector" TEXT NOT NULL,
    "approver" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_code_key" ON "Item"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_kind_key" ON "Warehouse"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_code_key" ON "Stage"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_sequence_key" ON "Stage"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "BomLine_productId_componentId_key" ON "BomLine"("productId", "componentId");

-- CreateIndex
CREATE INDEX "StockMovement_at_idx" ON "StockMovement"("at");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_no_key" ON "WorkOrder"("no");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionUnit_serialNo_key" ON "ProductionUnit"("serialNo");

-- CreateIndex
CREATE INDEX "ProductionUnit_currentStageId_status_idx" ON "ProductionUnit"("currentStageId", "status");

-- CreateIndex
CREATE INDEX "Operation_unitId_idx" ON "Operation"("unitId");

-- CreateIndex
CREATE INDEX "Operation_workerId_idx" ON "Operation"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_operationId_key" ON "Inspection"("operationId");

-- CreateIndex
CREATE INDEX "Inspection_unitId_idx" ON "Inspection"("unitId");

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomLine" ADD CONSTRAINT "BomLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomLine" ADD CONSTRAINT "BomLine_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomLine" ADD CONSTRAINT "BomLine_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ProductionUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionUnit" ADD CONSTRAINT "ProductionUnit_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionUnit" ADD CONSTRAINT "ProductionUnit_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ProductionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ProductionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
