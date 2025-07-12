// src/songlink.js
import fetch from "node-fetch";

export const getUniversalLink = async (spotifyUrl) => {
  try {
    const res = await fetch(
      `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(spotifyUrl)}`
    );
    const data = await res.json();
    return data.pageUrl || spotifyUrl;
  } catch (err) {
    console.error("❌ Gagal konversi ke songlink:", err);
    return spotifyUrl;
  }
};
