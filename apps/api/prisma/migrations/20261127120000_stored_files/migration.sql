-- Uploaded files kept in the database when FILE_STORAGE=database (Vercel has no lasting disk)
CREATE TABLE "stored_files" (
    "key" VARCHAR(255) NOT NULL,
    "mime" VARCHAR(100) NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("key")
);
