// src/facebook.js

import fetch from "node-fetch";

// Baca versi API dari .env, dengan fallback ke v20.0 jika tidak ada
const API_VERSION = process.env.FACEBOOK_API_VERSION || 'v23.0';

/**
 * Memposting foto langsung ke album spesifik.
 * @param {string} imageUrl URL dari gambar yang akan diposting.
 * @param {string} message Caption untuk postingan.
 * @returns {Promise<string|null>} ID dari postingan yang baru dibuat.
 */
export const postToFacebook = async (imageUrl, message) => {
  const ALBUM_ID = process.env.FACEBOOK_ALBUM_ID;
  const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!ALBUM_ID) {
    console.warn("❗ FACEBOOK_ALBUM_ID not found. Facebook post skipped.");
    return null; 
  }

  try {
    const body = new URLSearchParams({
      url: imageUrl,
      caption: message,
      access_token: ACCESS_TOKEN,
    });

    const postRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${ALBUM_ID}/photos`,
      {
        method: "POST",
        body: body,
      }
    );

    const postData = await postRes.json();
    if (!postRes.ok || !postData.post_id) {
      console.error("❌ Failed to post to Facebook album:", postData);
      return null;
    }

    console.log("✅ Successfully posted to Facebook album! post_id:", postData.post_id);
    return postData.post_id;

  } catch (err) {
    console.error("❌ Major error during Facebook post:", err);
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
    const body = new URLSearchParams({
        message,
        access_token: ACCESS_TOKEN,
    });
      
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${postId}/comments`, { // <-- Menggunakan API_VERSION
      method: "POST",
      body: body,
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("❌ Failed to add comment:", data);
      return;
    }

    console.log("💬 Successfully added engagement comment to Facebook post!");
  } catch (err) {
    console.error("❌ Error while trying to comment on Facebook:", err);
  }
};