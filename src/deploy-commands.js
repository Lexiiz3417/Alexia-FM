// src/deploy-commands.js (VERSI DEBUGGING - BAHASA INDONESIA)

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

dotenv.config();

const commands = [];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('--- Memulai Pengecekan Kualitas File Command ---');

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    console.log(`[INFO] Mengecek file: ${file}`);
    
    try {
        const fileURL = pathToFileURL(filePath);
        const commandModule = await import(fileURL);

        // BAGIAN DEBUGGING UTAMA
        if (!commandModule.default) {
            console.error(`\n[ERROR KRITIS] File ${file} TIDAK PUNYA 'export default'. Ini dia penyebab masalahnya!\n`);
            continue; // Lanjut ke file berikutnya
        }

        const command = commandModule.default;

        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`[OK] File ${file} aman dan valid.`);
        } else {
            console.warn(`[PERINGATAN] Command di ${file} tidak punya properti "data" atau "execute".`);
        }
    } catch (e) {
        console.error(`[ERROR] Gagal mengimpor file ${file}. Pesan error:`, e);
    }
}

console.log('--- Pengecekan Kualitas Selesai ---');

// Jika tidak ada command yang valid, hentikan script
if (commands.length === 0) {
    console.log('Tidak ada command valid yang bisa didaftarkan. Script dihentikan.');
    process.exit(); // Keluar dari proses
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Mendaftarkan ${commands.length} application (/) commands.`);
        
        const data = await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands },
        );

        console.log(`Berhasil memuat ulang ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();