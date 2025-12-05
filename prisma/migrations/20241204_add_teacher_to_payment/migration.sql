-- AlterTable: Make studentId optional and add teacherId
ALTER TABLE "Payment" ALTER COLUMN "studentId" DROP NOT NULL;

-- Add teacherId column
ALTER TABLE "Payment" ADD COLUMN "teacherId" TEXT;

-- CreateIndex
CREATE INDEX "Payment_teacherId_idx" ON "Payment"("teacherId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
