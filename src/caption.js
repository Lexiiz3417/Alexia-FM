// src/caption.js

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

/**
 * Mengambil template acak dari file text dan mengisi data lagu beserta tags.
 * @param {object} data - { day, title, artist, link }
 */
export const generateCaption = async ({ day, title, artist, link }) => {
  
  // --- KONFIGURASI TAGS ---
  // Kamu bisa ubah daftar hashtag umum di sini
  const tags = "#MusicDiscovery #SongOfTheDay #NowPlaying #DailyVibes";

  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const templatePath = path.join(__dirname, '..', 'captions', 'default.txt');
    
    const raw = await readFile(templatePath, "utf-8");
    const templates = raw.split(/---+/).map((t) => t.trim()).filter(Boolean);
    const chosen = templates[Math.floor(Math.random() * templates.length)];

    return chosen
      .replace(/{day}/g, day)
      .replace(/{title}/g, title)
      .replace(/{artist}/g, artist)
      .replace(/{link}/g, link)
      .replace(/{tags}/g, tags); 

  } catch (error) {
    console.error("❌ Gagal membaca file caption, menggunakan template darurat:", error);
    
    // Fallback template
    return `🎵 ${title} – ${artist}\n🔗 Listen: ${link}\n\n${tags}`;
  }
};