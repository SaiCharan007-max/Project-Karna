import pool from "../config/db.js";

export const getUnfinishedFiles = async () => {
    const result = await pool.query(
        `
            SELECT * FROM uploads
            WHERE status = 'in_progress'
                AND updated_at < NOW() - INTERVAL '15 minutes';
        `,
    );
    return result.rows;
}

export const getCompletedFiles = async () => {
    const result = await pool.query(
        `   
            SELECT * FROM uploads
            WHERE status = 'completed'
                AND updated_at < NOW() - INTERVAL '15 minutes';
        `,
    );
    return result.rows;
}   