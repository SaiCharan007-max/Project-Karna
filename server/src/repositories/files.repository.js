import pool from "../config/db.js";

export const uploadFile = async (fileName, mimeType) => {
  const result = await pool.query(
    `
            INSERT INTO uploads(file_name, mime_type, status)
            VALUES($1, $2, 'in_progress')
            RETURNING id, file_name, mime_type, status
        `,
    [fileName, mimeType],
  );
  return result.rows[0];
};

export const updateStatus = async (fileId, status) => {
  const result = await pool.query(
    `
            UPDATE uploads
            SET status = $2
            WHERE id = $1
            RETURNING id, file_name, mime_type, status
        `,
    [fileId, status],
  );
  return result.rows[0];
};

export const completeUpload = async (fileId, path, size) => {
  const result = await pool.query(
    `
            UPDATE uploads
            SET storage_path = $2, total_size = $3, status = 'completed'
            WHERE id = $1
            RETURNING id, file_name, mime_type, status, storage_path, total_size
        `,
    [fileId, path, size],
  );
  return result.rows[0];
};
