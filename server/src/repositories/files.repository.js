  import pool from "../config/db.js";

  export const uploadFile = async (fileName, mimeType, expectedSize, expectedHash, idempotencyKey, extension) => {
    const result = await pool.query(
      `
        INSERT INTO uploads(original_name, mime_type, expected_size, expected_hash, status, idempotency_key, extension)
        VALUES($1, $2, $3, $4, 'in_progress', $5, $6)
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id, original_name, mime_type, expected_size, expected_hash, status
      `,
      [fileName, mimeType, expectedSize, expectedHash, idempotencyKey, extension],
    );
    return result.rows[0] || null;
  };

  export const updateStatus = async (fileId, status) => {
    const result = await pool.query(
      `
              UPDATE uploads
              SET status = $2
              WHERE id = $1
              RETURNING id, original_name, mime_type, status
          `,
      [fileId, status],
    );
    return result.rows[0] || null;
  };

  export const completeUpload = async (fileId, path, size, actualHash) => {
    const result = await pool.query(
      `
              UPDATE uploads
              SET storage_path = $2, total_size = $3, actual_hash = $4, status = 'completed'
              WHERE id = $1
              RETURNING id, original_name, mime_type, status, storage_path, total_size
          `,
      [fileId, path, size, actualHash],
    );
    return result.rows[0] || null;
  };


  export const checkExistence = async (idempotencyKey) => {
    const result = await pool.query(
      `SELECT id, status FROM uploads WHERE idempotency_key = $1`,
      [idempotencyKey],
    );
    return result.rows[0] || null;
  }