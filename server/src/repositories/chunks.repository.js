import pool from "../config/db.js";

export const getFileInfo = async (fileId) => {
    const result = await pool.query(
        `SELECT * FROM uploads WHERE id = $1`,
        [fileId]
    );
    return result.rows[0] || null;
};


export const recordUploadedChunk = async ({
    uploadId,
    chunkNumber,
    size,
    hash,
    storagePath,
}) => {
    const result = await pool.query(
        `INSERT INTO upload_chunks (
            upload_id,
            chunk_number,
            size,
            hash,
            storage_path,
            status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
            uploadId,
            chunkNumber,
            size,
            hash,
            storagePath,
            "uploaded",
        ]
    );

    return result.rows[0] || null;
};

export const createResumableUpload = async (
    fileName,
    mimeType,
    expectedSize,
    expectedHash,
    idempotencyKey,
    extension,
    chunkSize,
    totalChunks,
) => {
    const result = await pool.query(
        `INSERT INTO uploads (
            original_name,
            mime_type,
            expected_size,
            expected_hash,
            status,
            idempotency_key,
            extension,
            chunk_size,
            total_chunks,
            updated_at
        )
        VALUES ($1, $2, $3, $4, 'initiated', $5, $6, $7, $8, NOW())
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id, status, chunk_size, total_chunks`,
        [
            fileName,
            mimeType,
            expectedSize,
            expectedHash,
            idempotencyKey,
            extension,
            chunkSize,
            totalChunks,
        ]
    );

    return result.rows[0] || null;
};

export const getResumableUploadByIdempotencyKey = async (idempotencyKey) => {
    const result = await pool.query(
        `SELECT
            id,
            original_name,
            mime_type,
            expected_size,
            expected_hash,
            status,
            chunk_size,
            total_chunks
        FROM uploads
        WHERE idempotency_key = $1`,
        [idempotencyKey]
    );

    return result.rows[0] || null;
};
