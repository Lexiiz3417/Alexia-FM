// src/history.js
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Initialize table with cover_url support
pool.query(`
    CREATE TABLE IF NOT EXISTS play_history (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        user_id TEXT NOT NULL,
        source TEXT NOT NULL,
        cover_url TEXT, 
        played_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
`).then(() => {
    console.log("✅ [Supabase] Database connected & Table ready with Cover Support!");
}).catch(err => {
    console.error("❌ [Supabase] Failed to initialize table:", err);
});

/**
 * Log the currently playing track and perform auto-cleanup for old records
 */
export async function logPlayHistory(title, artist, userId, source, coverUrl) {
    const safeTitle = title ? title.trim() : 'Unknown Title';
    const safeArtist = artist ? artist.trim() : 'Unknown Artist';
    const safeUserId = userId ? userId : 'SYSTEM';
    const safeSource = source ? source : 'unknown';
    const safeCover = coverUrl ? coverUrl : null; 

    const insertQuery = `INSERT INTO play_history (title, artist, user_id, source, cover_url) VALUES ($1, $2, $3, $4, $5)`;
    const cleanQuery = `DELETE FROM play_history WHERE played_at < NOW() - INTERVAL '1 year'`;
    
    try {
        // 1. Insert new log
        await pool.query(insertQuery, [safeTitle, safeArtist, safeUserId, safeSource, safeCover]);
        
        // 2. Execute auto-cleanup
        const cleanResult = await pool.query(cleanQuery);
        
        // Log cleanup result if rows were deleted
        if (cleanResult.rowCount > 0) {
            console.log(`🧹 [Supabase] Auto-Clean: Deleted ${cleanResult.rowCount} old records (> 1 Year).`);
        }
        
    } catch (error) {
        console.error("❌ [Supabase] Failed to log track/clean database:", error);
    }
}

/**
 * Retrieve the most played songs
 */
export async function getTopSongs(days, limit) {
    try {
        const query = `
            SELECT 
                title, 
                artist, 
                MAX(cover_url) as cover_url, 
                CAST(COUNT(*) AS INTEGER) as play_count 
            FROM play_history 
            WHERE played_at >= NOW() - $1::INTERVAL 
            GROUP BY title, artist 
            ORDER BY play_count DESC, MAX(played_at) DESC 
            LIMIT $2
        `;

        const result = await pool.query(query, [`${days} days`, limit]);
        return result.rows;
    } catch (error) {
        console.error(`❌ [Supabase] Failed to fetch top songs:`, error);
        return [];
    }
}