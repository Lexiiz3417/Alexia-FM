// src/facebook.js

import fetch from "node-fetch";

/**
 * Memposting foto langsung ke album spesifik, yang juga akan muncul di timeline.
 * @param {string} imageUrl URL dari gambar yang akan diposting.
 * @param {string} message Caption untuk postingan.
 * @returns {Promise<string|null>} ID dari postingan yang baru dibuat, atau null jika gagal.
 */
export const postToFacebook = async (imageUrl, message) => {
  // Variabel dibaca DI DALAM fungsi untuk memastikan .env sudah dimuat.
  const ALBUM_ID = process.env.FACEBOOK_ALBUM_ID;
  const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!ALBUM_ID) {
    console.warn("❗ FACEBOOK_ALBUM_ID tidak ditemukan. Postingan Facebook di-skip.");
    return null; 
  }

  try {
    const postRes = await fetch(
      `https://graph.facebook.com/v20.0/${ALBUM_ID}/photos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          url: imageUrl,
          caption: message,
          access_token: ACCESS_TOKEN,
        }),
      }
    );

    const postData = await postRes.json();
    if (!postRes.ok || !postData.post_id) {
      console.error("❌ Gagal post ke album Facebook:", postData);
      return null;
    }

    console.log("✅ Post sukses ke album Facebook! post_id:", postData.post_id);
    return postData.post_id;

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
  const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

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

    console.log("💬 Komentar pancingan berhasil ditambahkan ke post Facebook!");
  } catch (err) { 
    console.error("❌ Error saat mencoba berkomentar di Facebook:", err);
  }
};