// src/telegram.js
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

// Inisialisasi Bot (Hanya jika token ada)
let bot = null;
if (process.env.TELEGRAM_BOT_TOKEN) {
    bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
}

/**
 * Mengirim gambar (Buffer) dan caption ke Channel Telegram.
 * @param {Buffer} imageBuffer - Data gambar mentah.
 * @param {string} caption - Caption utama (Judul, Link).
 * @param {string} comment - Komentar tambahan/engagement.
 */
export async function postToTelegram(imageBuffer, caption, comment) {
    // Cek kelengkapan Config
    if (!bot || !process.env.TELEGRAM_CHANNEL_ID) {
        console.warn("⚠️ Telegram Token or Channel ID missing. Skipping Telegram post.");
        return false;
    }

    try {
        console.log("🚀 Sending to Telegram Channel...");

        // Gabungkan Caption & Comment supaya rapi
        let fullCaption = caption;
        if (comment) {
            fullCaption += `\n\n💬 ${comment}`;
        }

        // Kirim Gambar ke Channel
        await bot.telegram.sendPhoto(
            process.env.TELEGRAM_CHANNEL_ID,
            { source: imageBuffer }, // Upload buffer langsung
            { caption: fullCaption }
        );

        console.log("✅ Successfully posted to Telegram!");
        return true;

    } catch (error) {
        console.error("❌ Failed to post to Telegram:", error.message);
        return false;
    }
}