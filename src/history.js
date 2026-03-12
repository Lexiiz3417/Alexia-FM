// src/history.js

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastikan folder 'data' ada supaya gak error saat bikin database
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Sesuaikan dengan path yang dipakai Keyv biar satu rumah
const dbPath = path.resolve(dataDir, 'db.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Gagal konek ke database History:', err.message);
    } else {
        console.log('✅ SQLite terhubung untuk fitur Alexia Wrapped.');
    }
});

// Bikin tabel play_history kalau belum ada
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS play_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            user_id TEXT NOT NULL,
            source TEXT NOT NULL,
            played_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

/**
 * Fungsi buat nyatet history lagu
 */
export function logPlayHistory(title, artist, userId, source) {
    const safeTitle = title ? title.trim() : 'Unknown Title';
    const safeArtist = artist ? artist.trim() : 'Unknown Artist';
    const safeUserId = userId ? userId : 'SYSTEM';
    const safeSource = source ? source : 'unknown';

    const query = `INSERT INTO play_history (title, artist, user_id, source) VALUES (?, ?, ?, ?)`;
    
    db.run(query, [safeTitle, safeArtist, safeUserId, safeSource], function(err) {
        if (err) {
            console.error('❌ Gagal nyatet history:', err.message);
        } else {
            // Uncomment kalau mau liat log di console tiap kali lagu tercatat
            // console.log(`📝 [HISTORY LOG] Tercatat: ${safeTitle} - ${safeArtist}`);
        }
    });
}

/**
 * Fungsi buat narik Top Songs (Weekly/Monthly/Yearly)
 */
export function getTopSongs(days, limit) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT title, artist, COUNT(*) as play_count 
            FROM play_history 
            WHERE played_at >= date('now', '-' || ? || ' days')
            GROUP BY title, artist 
            ORDER BY play_count DESC, played_at DESC
            LIMIT ?
        `;

        db.all(query, [days, limit], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}