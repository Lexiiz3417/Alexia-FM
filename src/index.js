// src/index.js (Versi Railway Final)
import dotenv from "dotenv";
import cron from "node-cron";
import Keyv from "keyv"; // <-- Pake Keyv
import { getRandomTrack } from "./spotify.js";
import { getUniversalLink } from "./songlink.js";
import { generateCaption } from "./caption.js";
import { postToFacebook } from "./facebook.js";
import { startDiscordBot, sendAutoPostEmbed, updateBotPresence } from "./discord.js";
import { keepAlive } from './keep_alive.js';

dotenv.config();

const db = new Keyv('sqlite://db.sqlite'); // <-- Inisialisasi Keyv
const START_DATE = new Date(process.env.START_DATE || "2025-07-08");

const performAutopost = async () => {
  try {
    console.log("🚀 Memulai tugas harian autoposting...");
    
    const today = new Date();
    const diffTime = today - START_DATE;
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const track = await getRandomTrack();
    
    updateBotPresence(track);
    const universalLink = await getUniversalLink(track.url);
    const caption = await generateCaption({ day: dayNumber, title: track.name, artist: track.artist, genre: track.genre, link: universalLink });
    
    if (process.env.FACEBOOK_PAGE_ID) {
        const postId = await postToFacebook(track.image, caption);
        console.log(`✅ Info lagu & caption siap. FB Post ID: ${postId}`);
    } else {
        console.log("✅ Info lagu & caption siap. Facebook post di-skip.");
    }

    // --- CARA BARU BUAT NGIRIM KE SEMUA SERVER ---
    console.log(`📣 Mengirim ke semua subscriber...`);
    let count = 0;
    for await (const [serverId, channelId] of db.iterator()) {
      try {
        await sendAutoPostEmbed({ caption, imageUrl: track.image, channelId });
        console.log(`👍 Berhasil kirim ke server ${serverId}`);
        count++;
      } catch (error) {
        console.error(`👎 Gagal kirim ke server ${serverId}:`, error.message);
      }
    }
    console.log(`Broadcast selesai, terkirim ke ${count} server.`);
    
    console.log(`✅ Tugas autopost untuk hari ke-${dayNumber} selesai.`);
  } catch (err) {
    console.error("❌ Terjadi error besar saat autopost:", err);
  }
};

console.log("🔥 Bot Service Alexia FM Dimulai (Edisi Railway)...");
keepAlive();
startDiscordBot();

console.log("⏰ Autopost dijadwalkan setiap hari jam 9:00 pagi (WIB).");
cron.schedule('0 9 * * *', performAutopost, { scheduled: true, timezone: "Asia/Jakarta" });
