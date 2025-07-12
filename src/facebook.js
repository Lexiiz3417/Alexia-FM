// src/facebook.js
import fetch from "node-fetch";

const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

export const postToFacebook = async (imageUrl, message) => {
  try {
    const url = `https://graph.facebook.com/v20.0/${PAGE_ID}/photos`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        url: imageUrl,
        caption: message,
        published: "true",
        access_token: ACCESS_TOKEN,
      }),
    });
    const data = await res.json();

    if (!res.ok || !data.post_id) {
      console.error("❌ Gagal post ke Facebook:", data);
      return null;
    }

    console.log("✅ Post sukses! post_id:", data.post_id);
    return data.post_id;
  } catch (err) {
    console.error("❌ Error saat posting:", err);
    return null;
  }
};

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
      console.error("❌ Gagal komen:", data);
      return;
    }

    console.log("💬 Komentar sukses!");
  } catch (err) {
    console.error("❌ Error saat komen:", err);
  }
};
