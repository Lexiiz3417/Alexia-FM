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

    // Hitung Day X
    const today = new Date();
    const diffTime = today - START_DATE;
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Step 1: Ambil lagu random dari playlist
    const track = await getRandomTrack();

    // Step 2: Convert link Spotify ke link universal (Songlink)
    const universalLink = await getUniversalLink(track.url);

    // Step 3: Buat caption
    const caption = await generateCaption({
      day: dayNumber,
      title: track.name,
      artist: track.artist,
      genre: track.genre,
      link: universalLink,
    });

    // Step 4: Post ke Facebook (gambar + caption)
    const postId = await postToFacebook(track.image, caption);

    if (postId) {
      // Step 5: Tambah komentar follow-up
      const comment = `Hey guys! Di Day ${dayNumber}, aku share lagu dari ${track.artist}. Menurut kalian gimana lagunya? 🎧`;
      await commentOnPost(postId, comment);
    }

    console.log(`✅ Selesai post Day ${dayNumber} ke Facebook Page!`);
  } catch (err) {
    console.error("❌ Error terjadi:", err);
  }
})();
