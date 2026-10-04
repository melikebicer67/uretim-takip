-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "serialTracked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ComponentSerial" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "serialNo" TEXT NOT NULL,
    "unitId" INTEGER NOT NULL,
    "operationId" INTEGER NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComponentSerial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComponentSerial_serialNo_idx" ON "ComponentSerial"("serialNo");

-- CreateIndex
CREATE INDEX "ComponentSerial_unitId_idx" ON "ComponentSerial"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentSerial_itemId_serialNo_key" ON "ComponentSerial"("itemId", "serialNo");

-- AddForeignKey
ALTER TABLE "ComponentSerial" ADD CONSTRAINT "ComponentSerial_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentSerial" ADD CONSTRAINT "ComponentSerial_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ProductionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentSerial" ADD CONSTRAINT "ComponentSerial_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Mevcut hammaddeler seri numaralı takip edilir
UPDATE "Item" SET "serialTracked" = true WHERE "type" = 'RAW';
