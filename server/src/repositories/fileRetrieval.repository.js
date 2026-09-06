import pool from '../config/db.js';

export const getFileById = async (fileId) => {
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
        WHERE id = $1;
        `,
        [fileId]
    );
    return result.rows[0];
};