// src/songlink.js

import fetch from "node-fetch";

/**
 * Mengambil data lagu yang sudah bersih (judul, artis, cover art) dari Odesli API.
 * @param {string} musicUrl - URL lagu dari YouTube Music.
 * @returns {Promise<object|null>} Objek berisi data lagu bersih atau null jika gagal.
 */
export const getOdesliData = async (musicUrl) => {
  try {
    const apiUrl = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(musicUrl)}&userCountry=ID`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`Odesli API returned status: ${response.status}`);
    }
    const data = await response.json();

    // Ambil data entitas utama (lagu/album) dari respons API
    const primaryEntity = data.entitiesByUniqueId[data.entityUniqueId];

    if (!primaryEntity) {
      console.warn("🟡 Could not find primary entity in Odesli response.");
      return null;
    }

    console.log(`✅ Successfully fetched clean data for "${primaryEntity.title}" from Odesli.`);
    return {
      pageUrl: data.pageUrl,
      title: primaryEntity.title,
      artist: primaryEntity.artistName,
      imageUrl: primaryEntity.thumbnailUrl, // URL cover art berkualitas tinggi
    };

  } catch (err) {
    console.error("❌ Gagal mengambil data dari Odesli (Song.link):", err);
    return null;
  }
};