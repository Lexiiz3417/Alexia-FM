// src/facebook.js (VERSI UPGRADE DENGAN ALBUM & KOMENTAR)

import fetch from "node-fetch";

const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const ALBUM_ID = process.env.FACEBOOK_ALBUM_ID; 
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

/**
 * Memposting foto langsung ke album spesifik, yang juga akan muncul di timeline.
 * @param {string} imageUrl URL dari gambar yang akan diposting.
 * @param {string} message Caption untuk postingan.
 * @returns {Promise<string|null>} ID dari postingan yang baru dibuat, atau null jika gagal.
 */
export const postToFacebook = async (imageUrl, message) => {
  // Jika tidak ada ALBUM_ID, fallback ke metode lama (post ke timeline biasa)
  if (!ALBUM_ID) {
    console.warn("❗ FACEBOOK_ALBUM_ID tidak ditemukan. Memposting ke timeline utama...");
    // Di sini kamu bisa masukkan lagi kode postToFacebook yang lama jika mau ada fallback
    // Untuk sekarang, kita fokus ke metode album.
    return null; 
  }

  try {
    // Langsung post ke endpoint album, ini lebih simpel dan direct!
    const postRes = await fetch(
      `https://graph.facebook.com/v20.0/${ALBUM_ID}/photos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          url: imageUrl,
          caption: message, // 'caption' digunakan saat post ke album, bukan 'message'
          access_token: ACCESS_TOKEN,
        }),
      }
    );

    const postData = await postRes.json();
    if (!postRes.ok || !postData.post_id) {
      console.error("❌ Gagal post ke album:", postData);
      return null;
    }

    console.log("✅ Post sukses ke album & timeline! post_id:", postData.post_id);
    return postData.post_id; // Kita butuh post_id untuk komentar

  } catch (err) {
    console.error("❌ Error besar saat post ke Facebook:", err);
    return null;
  }
};

/**
 * Menambahkan komentar ke postingan Facebook.
 * @param {string} postId ID dari postingan yang akan dikomentari.
 * @param {string} message Isi komentar.
 */
export const commentOnPost = async (postId, message) => {
  try {
    const url = `https://graph.facebook.com/v20.0/${postId}/comments`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        message,
        access_token: ACCESS_TOKEN,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("❌ Gagal menambahkan komentar:", data);
      return;
    }

    console.log("💬 Komentar pancingan berhasil ditambahkan!");
  } catch (err) {
    console.error("❌ Error saat mencoba berkomentar:", err);
  }
};