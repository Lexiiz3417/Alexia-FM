// src/facebook.js
import fetch from "node-fetch";

const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

export const postToFacebook = async (imageUrl, message) => {
  try {
    // Step 1: Upload foto tanpa publish
    const uploadRes = await fetch(
      `https://graph.facebook.com/v20.0/${PAGE_ID}/photos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          url: imageUrl,
          published: "false",
          access_token: ACCESS_TOKEN,
        }),
      }
    );

    const uploadData = await uploadRes.json();
    if (!uploadData.id) {
      console.error("❌ Gagal upload foto:", uploadData);
      return null;
    }

    const photoId = uploadData.id;
    console.log("🖼️ Foto berhasil diupload (id):", photoId);

    // Step 2: Buat post ke feed dengan attach foto
    const postRes = await fetch(
      `https://graph.facebook.com/v20.0/${PAGE_ID}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          message: message,
          attached_media: JSON.stringify([{ media_fbid: photoId }]),
          access_token: ACCESS_TOKEN,
        }),
      }
    );

    const postData = await postRes.json();
    if (!postRes.ok || !postData.id) {
      console.error("❌ Gagal post ke timeline:", postData);
      return null;
    }

    console.log("✅ Post sukses ke timeline! post_id:", postData.id);
    return postData.id;
  } catch (err) {
    console.error("❌ Error saat post:", err);
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
