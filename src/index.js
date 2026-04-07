// src/index.js

import dotenv from "dotenv";
import cron from "node-cron";
import fetch from "node-fetch"; 
import { startDiscordBot } from "./discord.js";
import { keepAlive } from './keep_alive.js';
import { performAutopost } from './autopost.js';
import { performRecapAutopost } from './recapAutopost.js';
import { startWhatsAppBot } from './whatsapp.js';

dotenv.config();

console.log("🔥 Alexia FM Bot Service Starting...");

// 1. Jalankan Server Keep-Alive (Internal Express Server)
keepAlive();

// 🌟 2. DOUBLE PROTECTION: SELF-PINGING (Anti-Sleep Koyeb/Railway)
const APP_URL = process.env.APP_URL; 
if (APP_URL) {
    setInterval(async () => {
        try {
            const res = await fetch(APP_URL);
            // 🤫 DIBISUKAN BIAR GAK NYAMPAH DI LOG TERMINAL
            // console.log(`📡 [Keep-Alive] Self-pinging ${APP_URL}... Status: ${res.status}`);
        } catch (e) {
            console.error("❌ [Keep-Alive] Internal ping failed:", e.message);
        }
    }, 5 * 60 * 1000); // Ping tiap 5 menit
} else {
    console.warn("⚠️ [Keep-Alive] APP_URL not set. Internal self-ping skipped.");
}

// 3. Jalankan Bot Discord & Tangkap Client-nya
const client = await startDiscordBot();

// 4. Nyalain mesin Alexia WhatsApp!
startWhatsAppBot();

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
cron.schedule('0 0 1 * *', async () => {
    console.log("🔔 Monthly Recap triggered!");
    await performRecapAutopost(client, 'monthly');
}, { scheduled: true, timezone: "Asia/Jakarta" });


// 📌 4. YEARLY RECAP (Tiap Tanggal 1 Januari, Jam 00:00 WIB)
cron.schedule('0 0 1 1 *', async () => {
    console.log("🔔 Yearly Recap triggered!");
    await performRecapAutopost(client, 'yearly');
}, { scheduled: true, timezone: "Asia/Jakarta" });