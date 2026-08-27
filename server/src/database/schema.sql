CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    original_name TEXT NOT NULL,
    mime_type TEXT,

    expected_size BIGINT,
    expected_hash TEXT,
    total_size BIGINT,
    actual_hash TEXT,

    storage_path TEXT,

    status TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE uploads
ADD COLUMN idempotency_key UUID NOT NULL UNIQUE;