-- CreateTable
CREATE TABLE "audio_jobs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "input_url" TEXT NOT NULL,
    "output_url" TEXT,
    "output_size_bytes" INTEGER,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "audio_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audio_jobs_job_id_key" ON "audio_jobs"("job_id");

-- CreateIndex
CREATE INDEX "audio_jobs_user_id_idx" ON "audio_jobs"("user_id");

-- CreateIndex
CREATE INDEX "audio_jobs_status_idx" ON "audio_jobs"("status");

-- AddForeignKey
ALTER TABLE "audio_jobs" ADD CONSTRAINT "audio_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
