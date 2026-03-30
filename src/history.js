// src/history.js
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Establish connection to Supabase using the connection string from .env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for connecting to Supabase cloud servers
    }
});

// Automatically create the history table if it doesn't exist upon startup
// Matches the exact schema from the old SQLite version
pool.query(`
    CREATE TABLE IF NOT EXISTS play_history (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        user_id TEXT NOT NULL,
        source TEXT NOT NULL,
        played_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
`).then(() => {
    console.log("✅ [Supabase] Database connected & Table ready!");
}).catch(err => {
    console.error("❌ [Supabase] Failed to initialize table:", err);
});

/**
 * Log the currently playing track into the cloud database
 * @param {string} title - The title of the track
 * @param {string} artist - The artist of the track
 * @param {string} userId - The ID of the user who requested the track
 * @param {string} source - The source platform of the track (e.g., youtube, spotify)
 */
export async function logPlayHistory(title, artist, userId, source) {
    const safeTitle = title ? title.trim() : 'Unknown Title';
    const safeArtist = artist ? artist.trim() : 'Unknown Artist';
    const safeUserId = userId ? userId : 'SYSTEM';
    const safeSource = source ? source : 'unknown';

    const query = `INSERT INTO play_history (title, artist, user_id, source) VALUES ($1, $2, $3, $4)`;
    
    try {
        await pool.query(query, [safeTitle, safeArtist, safeUserId, safeSource]);
        // Uncomment to see logs in console every time a song is recorded
        // console.log(`☁️ [Supabase] Logged: ${safeTitle} - ${safeArtist}`);
    } catch (error) {
        console.error("❌ [Supabase] Failed to log track to database:", error);
    }
}

/**
 * Retrieve the most played songs for a specific timeframe (Weekly/Monthly/Yearly)
 * @param {number} days - Number of days to look back
 * @param {number} limit - Maximum number of tracks to return
 * @returns {Promise<Array>} Array of song objects with play_count
 */
export async function getTopSongs(days, limit) {
    try {
        // Casting COUNT(*) to INTEGER is crucial for Canvas rendering logic
        const query = `
            SELECT title, artist, CAST(COUNT(*) AS INTEGER) as play_count 
            FROM play_history 
            WHERE played_at >= NOW() - $1::INTERVAL 
            GROUP BY title, artist 
            ORDER BY play_count DESC, MAX(played_at) DESC 
            LIMIT $2
        `;

        const result = await pool.query(query, [`${days} days`, limit]);
        return result.rows;
    } catch (error) {
        console.error(`❌ [Supabase] Failed to fetch top songs for the last ${days} days:`, error);
        return [];
    }
}