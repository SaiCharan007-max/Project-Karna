import pool from "../config/db.js";

export const getUnfinishedFiles = async () => {
  const result = await pool.query(
    `
      SELECT
        id,
        original_name,
        mime_type,
        expected_size,
        expected_hash,
        total_size,
        actual_hash,
        storage_path,
        status,
        extension,
        created_at,
        updated_at
      FROM uploads
      WHERE status = 'in_progress'
        AND updated_at < NOW() - INTERVAL '1 minute'
      ORDER BY updated_at ASC;
    `,
  );

  return result.rows;
};

export const getCompletedFiles = async () => {
  const result = await pool.query(
    `
      SELECT
        id,
        original_name,
        mime_type,
        expected_size,
        expected_hash,
        total_size,
        actual_hash,
        storage_path,
        status,
        extension,
        created_at,
        updated_at
      FROM uploads
      WHERE status = 'completed'
        AND updated_at < NOW() - INTERVAL '1 minutes'
      ORDER BY updated_at ASC;
    `,
  );

  return result.rows;
};