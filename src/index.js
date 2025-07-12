import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const pageId = process.env.FACEBOOK_PAGE_ID;
const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

// POST ke Facebook Timeline (feed) dengan gambar dan caption
export async function postToFacebook(imageUrl, message) {
  const endpoint = `https://graph.facebook.com/${pageId}/feed`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      picture: imageUrl,
      access_token: accessToken,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(
      `Gagal post ke timeline: ${data.error?.message || res.statusText}`
    );
  }

  console.log(`✅ Post berhasil! ID: ${data.id}`);
  return data.id;
}

// KOMENTAR ke postingan yang sudah berhasil dipost
export async function commentOnPost(postId, comment) {
  const endpoint = `https://graph.facebook.com/${postId}/comments`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: comment,
      access_token: accessToken,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(
      `Gagal komentar: ${data.error?.message || res.statusText}`
    );
  }

  console.log(`💬 Komentar follow-up berhasil: ${data.id}`);
}
