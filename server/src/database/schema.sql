DROP TABLE IF EXISTS upload_chunks;
DROP TABLE IF EXISTS uploads;


CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    original_name TEXT NOT NULL,
    mime_type TEXT,
    extension VARCHAR(20),

    expected_size BIGINT,
    expected_hash TEXT,
    total_size BIGINT,
    actual_hash TEXT,

    storage_path TEXT,

    status TEXT NOT NULL,

    idempotency_key UUID NOT NULL UNIQUE,

    -- Only set for chunked uploads; NULL for normal Busboy uploads.
    chunk_size BIGINT,
    total_chunks INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE upload_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,

    chunk_number INTEGER NOT NULL,

    size BIGINT NOT NULL,

    hash TEXT NOT NULL,

    storage_path TEXT NOT NULL,

    status TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (upload_id, chunk_number)
);
