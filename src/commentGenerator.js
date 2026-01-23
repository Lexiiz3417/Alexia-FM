// src/commentGenerator.js

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

/**
 * Membaca file komentar dan memilih satu secara acak.
 * @param {string} title - Judul lagu
 * @param {string} artist - Nama artis
 * @returns {Promise<string>} Komentar terpilih.
 */
export async function getRandomComment(title, artist) {
  try {
    // 1. Cari lokasi file comments/default.txt
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const templatePath = path.join(__dirname, '..', 'comments', 'default.txt');
    
    // 2. Baca file
    const raw = await readFile(templatePath, "utf-8");
    
    // 3. Pisahkan berdasarkan "---"
    const comments = raw.split(/---+/).map((t) => t.trim()).filter(Boolean);
    
    // 4. Pilih satu secara acak
    const selected = comments[Math.floor(Math.random() * comments.length)];

    // 5. Ganti placeholder {title} dan {artist} dengan data asli
    return selected
      .replace(/{title}/g, title)
      .replace(/{artist}/g, artist);

  } catch (error) {
    console.error("❌ Gagal membaca file komentar, menggunakan fallback:", error);
    // Fallback jika file tidak ditemukan
    return "What do you think of this track? Let me know! 👇";
  }
}