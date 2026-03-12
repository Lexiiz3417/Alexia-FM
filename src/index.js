// src/index.js

import dotenv from "dotenv";
import cron from "node-cron";
import { startDiscordBot } from "./discord.js";
import { keepAlive } from './keep_alive.js';
import { performAutopost } from './autopost.js';
import { performRecapAutopost } from './recapAutopost.js';

dotenv.config();

console.log("🔥 Alexia FM Bot Service Starting...");

// 1. Jalankan Server Keep-Alive (Supaya bot gak mati di Railway)
keepAlive();

// 2. Jalankan Bot Discord & Tangkap Client-nya
const client = await startDiscordBot();

// ==========================================
// ⏰ SCHEDULER / CRON JOBS (Waktu Asia/Jakarta)
// ==========================================

console.log("⏰ Daily Autopost scheduled for 12:00 PM WIB.");
console.log("⏰ Weekly Recap scheduled for Monday 00:00 WIB.");
console.log("⏰ Monthly Recap scheduled for 1st day 00:00 WIB.");
console.log("⏰ Yearly Recap scheduled for Jan 1st 00:00 WIB.");

// 📌 1. DAILY AUTOPOST (Tiap Jam 12 Siang)
cron.schedule('0 12 * * *', async () => {
    console.log("🔔 Daily Autopost triggered!");
    await performAutopost(client);
}, { scheduled: true, timezone: "Asia/Jakarta" });


// 📌 2. WEEKLY RECAP (Tiap Hari Senin, Jam 00:00 WIB)
cron.schedule('0 0 * * 1', async () => {
    console.log("🔔 Weekly Recap triggered!");
    await performRecapAutopost(client, 'weekly');
}, { scheduled: true, timezone: "Asia/Jakarta" });


// 📌 3. MONTHLY RECAP (Tiap Tanggal 1, Jam 00:00 WIB)
// Ini sama dengan detik pertama di akhir bulan
cron.schedule('0 0 1 * *', async () => {
    console.log("🔔 Monthly Recap triggered!");
    await performRecapAutopost(client, 'monthly');
}, { scheduled: true, timezone: "Asia/Jakarta" });


// 📌 4. YEARLY RECAP (Tiap Tanggal 1 Januari, Jam 00:00 WIB)
cron.schedule('0 0 1 1 *', async () => {
    console.log("🔔 Yearly Recap triggered!");
    await performRecapAutopost(client, 'yearly');
}, { scheduled: true, timezone: "Asia/Jakarta" });