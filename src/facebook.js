// src/facebook.js

import fetch from "node-fetch";
import FormData from "form-data"; // <-- Pastikan kamu sudah 'npm install form-data'

const API_VERSION = process.env.FACEBOOK_API_VERSION || 'v23.0';

/**
 * Memposting foto ke halaman Facebook. Bisa melalui upload file (buffer) atau URL.
 * @param {string} imageUrl - URL gambar asli, sebagai fallback.
 * @param {string} caption - Teks caption untuk postingan.
 * @param {Buffer|null} [imageBuffer=null] - Buffer gambar yang sudah diproses (misal: dipotong).
 * @returns {Promise<string|null>} ID postingan Facebook atau null jika gagal.
 */
export const postToFacebook = async (imageUrl, caption, imageBuffer = null) => {
  const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
  const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!PAGE_ID) {
    console.warn("❗ FACEBOOK_PAGE_ID not found. Facebook post skipped.");
    return null; 
  }

  try {
    let response;
    // Prioritaskan upload buffer jika tersedia, karena ini adalah gambar yang sudah kita proses
    if (imageBuffer) {
      console.log("🚀 Uploading cropped image buffer to Facebook...");
      const form = new FormData();
      form.append('caption', caption);
      form.append('source', imageBuffer, { filename: 'cover.png', contentType: 'image/png' });
      form.append('access_token', ACCESS_TOKEN);

      response = await fetch(`https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/photos`, {
        method: "POST",
        body: form,
      });

    } else { // Fallback jika tidak ada buffer, pakai metode URL lama
      console.log("🟡 No image buffer. Posting to Facebook using URL...");
      const body = new URLSearchParams({
        url: imageUrl,
        caption: caption,
        access_token: ACCESS_TOKEN,
      });

      response = await fetch(`https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/photos`, {
        method: "POST",
        body: body,
      });
    }

    const postData = await response.json();
    if (!response.ok || !postData.post_id) {
      console.error("❌ Failed to post to Facebook feed:", postData);
      return null;
    }

    console.log("✅ Successfully posted to Facebook feed! post_id:", postData.post_id);
    return postData.post_id;

  } catch (err) {
    console.error("❌ Major error during Facebook post:", err);
    return null;
  }
};

/**
 * Menambahkan komentar pada postingan Facebook yang sudah ada.
 * @param {string} postId - ID dari postingan.
 * @param {string} message - Isi komentar.
 */
export const commentOnPost = async (postId, message) => {
  const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

  try {
    const body = new URLSearchParams({
        message,
        access_token: ACCESS_TOKEN,
    });
      
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${postId}/comments`, {
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