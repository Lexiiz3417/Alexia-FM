// src/index.js
import dotenv from "dotenv";
dotenv.config();

import { getRandomTrack } from "./spotify.js";
import { getUniversalLink } from "./songlink.js";
import { generateCaption } from "./caption.js";
import { postToFacebook, commentOnPost } from "./facebook.js";

const START_DATE = new Date(process.env.START_DATE || "2025-07-08");

(async () => {
  try {
    console.log("🚀 Mulai proses autoposting...");

    const today = new Date();
    const diffTime = today - START_DATE;
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    console.log(`📅 Hari ke-${dayNumber} sejak ${START_DATE.toDateString()}`);

    console.log("✅ Step 1: Ambil lagu random dari playlist");
    const track = await getRandomTrack();
    console.log("🎵 Track yang dipilih:", track);

    console.log("✅ Step 2: Konversi link Spotify ke universal link");
    const universalLink = await getUniversalLink(track.url);
    console.log("🔗 Universal Link:", universalLink);

    console.log("✅ Step 3: Generate caption");
    const caption = await generateCaption({
      day: dayNumber,
      title: track.name,
      artist: track.artist,
      genre: track.genre,
      link: universalLink,
    });
    console.log("📝 Caption dibuat:", caption);

    console.log("✅ Step 4: Post ke Facebook");
    const postId = await postToFacebook(track.image, caption);
    console.log("📌 Post ID:", postId);

    if (postId) {
      console.log("✅ Step 5: Komentar follow-up");
      const comment = `Hey guys! Di Day ${dayNumber}, aku share lagu dari ${track.artist}. Menurut kalian gimana lagunya? 🎧`;
      await commentOnPost(postId, comment);
      console.log("💬 Komentar berhasil diposting!");
    } else {
      console.warn("⚠️ Post ID kosong, komentar tidak ditambahkan.");
    }

    console.log(`✅ Selesai post Day ${dayNumber} ke Facebook Page!`);
  } catch (err) {
    console.error("❌ Error terjadi:", err);
  }
})();
