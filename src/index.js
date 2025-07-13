  // src/index.js
  import dotenv from "dotenv";
  import cron from "node-cron";
  import Database from "@replit/database";
  import { getRandomTrack } from "./spotify.js";
  import { getUniversalLink } from "./songlink.js";
  import { generateCaption } from "./caption.js";
  import { postToFacebook } from "./facebook.js";
  import { startDiscordBot, sendAutoPostEmbed, updateBotPresence } from "./discord.js";
  import { keepAlive } from './keep_alive.js';

  dotenv.config();

  // Inisialisasi Database
  const db = new Database();
  const START_DATE = new Date(process.env.START_DATE || "2025-07-08");

  /**
   * Fungsi utama untuk menjalankan proses autopost harian ke semua server.
   */
  const performAutopost = async () => {
    try {
      console.log("🚀 Memulai tugas harian autoposting (Multi-Server)...");

      // --- Step 1: Siapin semua materi postingan (lagu, caption, dll) ---
      const today = new Date();
      const diffTime = today - START_DATE;
      const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const track = await getRandomTrack();

      // Update status bot-nya dulu
      updateBotPresence(track);

      const universalLink = await getUniversalLink(track.url);
      const caption = await generateCaption({ day: dayNumber, title: track.name, artist: track.artist, genre: track.genre, link: universalLink });

      // Post ke Facebook dulu (kalau ada)
      if (process.env.FACEBOOK_PAGE_ID) {
          const postId = await postToFacebook(track.image, caption);
          console.log(`✅ Info lagu & caption siap. FB Post ID: ${postId}`);
      } else {
          console.log("✅ Info lagu & caption siap. Facebook post di-skip.");
      }

      // --- Step 2: Kirim ke semua server Discord yang terdaftar ---
      const allServerIds = await db.list();
      console.log(`📣 Mengirim ke ${allServerIds.length} server...`);

      for (const serverId of allServerIds) {
        const channelId = await db.get(serverId);
        if (channelId) {
            try {
              await sendAutoPostEmbed({ 
                  caption: caption, 
                  imageUrl: track.image,
                  channelId: channelId // Kirim ke channel spesifik
              });
              console.log(`👍 Berhasil kirim ke server ${serverId}`);
            } catch (error) {
              console.error(`👎 Gagal kirim ke server ${serverId}:`, error.message);
            }
        }
      }

      console.log(`✅ Tugas autopost untuk hari ke-${dayNumber} selesai.`);
    } catch (err) {
      console.error("❌ Terjadi error besar saat menjalankan tugas autopost:", err);
    }
  };

  // --- Inisialisasi Layanan ---
  console.log("🔥 Bot Service Alexia FM Dimulai (versi Go Public)...");
  console.log("-----------------------------------------");

  // Menjalankan server web kecil agar bot tetap aktif 24/7
  keepAlive();

  // Menjalankan dan menginisialisasi bot Discord
  startDiscordBot();

  // Menjadwalkan tugas autopost untuk berjalan setiap hari
  // '0 9 * * *' = berjalan setiap jam 9:00 pagi (WIB)
  console.log("⏰ Autopost dijadwalkan setiap hari jam 9:00 pagi (WIB).");
  cron.schedule('0 9 * * *', performAutopost, {
    scheduled: true,
    timezone: "Asia/Jakarta"
  });