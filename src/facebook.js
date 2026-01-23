// src/facebook.js

import fetch from 'node-fetch';
import FormData from 'form-data';

const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

/**
 * Memposting gambar dan caption ke Facebook Page (Feed).
 * Mendukung URL string maupun Buffer gambar.
 * @param {string|Buffer} imageSource - URL gambar (string) atau Buffer gambar.
 * @param {string} caption - Caption postingan.
 * @returns {Promise<string|null>} ID postingan jika sukses, atau null jika gagal.
 */
export async function postToFacebook(imageSource, caption) {
  if (!PAGE_ID || !ACCESS_TOKEN) {
    console.warn("⚠️ Facebook Page ID or Access Token is missing. Skipping FB post.");
    return null;
  }

  const url = `https://graph.facebook.com/v18.0/${PAGE_ID}/photos`;
  
  try {
    const formData = new FormData();
    formData.append('access_token', ACCESS_TOKEN);
    formData.append('message', caption);
    formData.append('published', 'true');

    // LOGIKA BARU: Cek apakah inputnya Buffer atau URL
    if (Buffer.isBuffer(imageSource)) {
        // Jika Buffer, upload sebagai file
        // 'file.png' adalah nama dummy, FB gak peduli namanya
        formData.append('source', imageSource, { filename: 'image.png', contentType: 'image/png' });
        console.log("🚀 Uploading image buffer directly to Facebook...");
    } else {
        // Jika URL, kirim sebagai parameter 'url'
        formData.append('url', imageSource);
        console.log("🚀 Sending image URL to Facebook...");
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Note: node-fetch + form-data otomatis set headers yang benar
    });

    const data = await response.json();

    if (data.error) {
      console.error("❌ Failed to post to Facebook feed:", data);
      return null;
    }

    console.log(`✅ Successfully posted to Facebook feed! post_id: ${data.id}`);
    return data.post_id; // Mengembalikan post_id (biasanya format: PAGEID_POSTID)

  } catch (error) {
    console.error("❌ Error posting to Facebook:", error);
    return null;
  }
}

/**
 * Menambahkan komentar pada postingan yang sudah ada.
 * @param {string} postId - ID postingan Facebook.
 * @param {string} message - Isi komentar.
 */
export async function commentOnPost(postId, message) {
  if (!ACCESS_TOKEN || !postId) return;

  // URL untuk posting komentar: /{post-id}/comments
  const url = `https://graph.facebook.com/v18.0/${postId}/comments`;

  try {
    // Untuk komentar teks biasa, kita bisa pake JSON body aja, lebih simpel
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        access_token: ACCESS_TOKEN
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("❌ Failed to comment on Facebook post:", data);
    } else {
      console.log("💬 Successfully added engagement comment to Facebook post!");
    }
  } catch (error) {
    console.error("❌ Error commenting on Facebook:", error);
  }
}