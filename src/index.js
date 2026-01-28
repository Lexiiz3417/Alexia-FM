// src/index.js

import dotenv from "dotenv";
import cron from "node-cron";
import { startDiscordBot } from "./discord.js";
import { keepAlive } from './keep_alive.js';
import { performAutopost } from './autopost.js';

dotenv.config();

console.log("🔥 Alexia FM Bot Service Starting...");

// 1. Jalankan Server Keep-Alive (Supaya bot gak mati di Railway)
keepAlive();

// 2. Jalankan Bot Discord & Tangkap Client-nya
// Kita pakai 'await' karena startDiscordBot itu async
const client = await startDiscordBot();

// 3. Jadwalkan Autopost
console.log("⏰ Autopost scheduled for 09:00 AM WIB daily.");

// Format Cron: Menit Jam * * * (0 9 = Jam 9:00 Pagi)
cron.schedule('0 9 * * *', async () => {
  console.log("🔔 Scheduler triggered! Running the autopost task...");
  
  // Panggil fungsi autopost dengan client yang sudah login
  await performAutopost(client);
  
}, { 
  scheduled: true, 
  timezone: "Asia/Jakarta" 
});