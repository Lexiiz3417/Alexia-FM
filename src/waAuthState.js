// src/waAuthState.js
import { BufferJSON, initAuthCreds } from '@whiskeysockets/baileys';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Konek ke Supabase
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export const usePostgresAuthState = async () => {
    // 1. Bikin tabel khusus buat nyimpen sesi WA kalo belom ada
    await pool.query(`
        CREATE TABLE IF NOT EXISTS wa_auth (
            id VARCHAR(255) PRIMARY KEY,
            data TEXT
        )
    `);

    // 2. Fungsi buat nulis/update sesi ke Supabase
    const writeData = async (data, id) => {
        const stringifiedData = JSON.stringify(data, BufferJSON.replacer);
        await pool.query(
            `INSERT INTO wa_auth (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
            [id, stringifiedData]
        );
    };

    // 3. Fungsi buat baca sesi dari Supabase
    const readData = async (id) => {
        const res = await pool.query(`SELECT data FROM wa_auth WHERE id = $1`, [id]);
        if (res.rows.length > 0) {
            return JSON.parse(res.rows[0].data, BufferJSON.reviver);
        }
        return null;
    };

    // 4. Fungsi buat hapus sesi (kalo WA logout/expired)
    const removeData = async (id) => {
        await pool.query(`DELETE FROM wa_auth WHERE id = $1`, [id]);
    };

    const creds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = { ...value, transactionId: value.transactionId };
                            }
                            if (value) data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => writeData(creds, 'creds')
    };
};