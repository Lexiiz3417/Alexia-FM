// src/index.js

import dotenv from "dotenv";
import cron from "node-cron";
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Impor fungsi-fungsi dari file lain
import { startDiscordBot } from "./discord.js";
import { keepAlive } from './keep_alive.js';
import { performAutopost } from './autopost.js'; // <-- Impor fungsi autopost dari file barunya

dotenv.config();

// =================================================================
// BAGIAN INI BERTUGAS MEMBUAT BOT DAN MEMUAT SEMUA COMMAND
// =================================================================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const fileURL = pathToFileURL(filePath);
  const { default: command } = await import(fileURL);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: /${command.data.name}`);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}
// =================================================================


// --- BAGIAN UTAMA ---
console.log("🔥 Alexia FM Bot Service Started (Professional Edition)...");

// Menjalankan server kecil untuk keep-alive
keepAlive();

// Menjalankan dan login bot Discord dengan semua command yang sudah dimuat
startDiscordBot(client); 

// Menjadwalkan tugas autoposting harian
console.log("⏰ Autopost scheduled for 9:00 AM WIB daily.");
cron.schedule('0 12 * * *', () => {
  console.log("Scheduler triggered! Running the autopost task...");
  // Panggil fungsi yang sudah di-import, dan berikan 'client' yang sudah siap
  performAutopost(client);
}, { 
  scheduled: true, 
  timezone: "Asia/Jakarta" 
});