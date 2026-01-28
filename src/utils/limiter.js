// src/utils/limiter.js

import Keyv from 'keyv';
import dotenv from 'dotenv';

dotenv.config();

// Koneksi ke Database yang sama
const db = new Keyv('sqlite://data/db.sqlite');

/**
 * Cek apakah user boleh menggunakan command ini.
 * @param {string} userId - ID Discord user
 * @param {string} commandName - Nama command (misal: 'createcard', 'testpost')
 * @param {number} limit - Batas maksimal penggunaan per hari
 * @returns {Promise<object>} { allowed: boolean, message: string, usageCount: number }
 */
export async function checkUserLimit(userId, commandName, limit) {
    // 1. BYPASS UNTUK OWNER (Raja Bebas)
    if (userId === process.env.OWNER_ID) {
        return { allowed: true, message: "👑 Owner Access", usageCount: 0 };
    }

    const todayStr = new Date().toISOString().split('T')[0]; // Format: 2025-01-29
    const key = `limit:${commandName}:${userId}`; // Kunci unik per command per user

    // Ambil data usage dari DB
    let userUsage = await db.get(key) || { date: todayStr, count: 0 };

    // Reset jika ganti hari
    if (userUsage.date !== todayStr) {
        userUsage = { date: todayStr, count: 0 };
    }

    // Cek Kuota
    if (userUsage.count >= limit) {
        return { 
            allowed: false, 
            message: `⛔ **Daily Limit Reached!**\nYou can only use \`/${commandName}\` **${limit} times** per day.\nTry again tomorrow!`,
            usageCount: userUsage.count
        };
    }

    return { allowed: true, usageCount: userUsage.count, key, data: userUsage };
}

/**
 * Panggil fungsi ini SETELAH command sukses dijalankan untuk mengurangi kuota.
 */
export async function incrementUserLimit(userId, commandName) {
    if (userId === process.env.OWNER_ID) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const key = `limit:${commandName}:${userId}`;
    
    let userUsage = await db.get(key) || { date: todayStr, count: 0 };
    
    // Pastikan tanggal update
    if (userUsage.date !== todayStr) userUsage = { date: todayStr, count: 0 };

    userUsage.count += 1;
    await db.set(key, userUsage);
}