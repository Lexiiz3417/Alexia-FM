// src/songlink.js

import fetch from "node-fetch";

/**
 * Mengambil data lagu yang sudah bersih dengan memprioritaskan platform terbaik (Apple Music > Spotify > Default).
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

    let bestEntity = null;

    // Prioritas 1: Cek apakah ada data dari Apple Music
    const appleMusicLink = data.linksByPlatform.appleMusic;
    if (appleMusicLink) {
        bestEntity = data.entitiesByUniqueId[appleMusicLink.entityUniqueId];
        console.log("✅ Found clean data from Apple Music.");
    }

    // Prioritas 2: Jika tidak ada dari Apple Music, cek Spotify
    if (!bestEntity) {
        const spotifyLink = data.linksByPlatform.spotify;
        if (spotifyLink) {
            bestEntity = data.entitiesByUniqueId[spotifyLink.entityUniqueId];
            console.log("✅ Found clean data from Spotify.");
        }
    }

    // Prioritas 3: Jika masih tidak ada, pakai data default dari Odesli
    if (!bestEntity) {
        bestEntity = data.entitiesByUniqueId[data.entityUniqueId];
        console.log("🟡 No Apple Music/Spotify data. Falling back to default Odesli entity.");
    }

    if (!bestEntity) {
      console.warn("❌ Could not find any entity in Odesli response.");
      return null;
    }

    return {
      pageUrl: data.pageUrl,
      title: bestEntity.title,
      artist: bestEntity.artistName,
      imageUrl: bestEntity.thumbnailUrl,
    };

  } catch (err) {
    console.error("❌ Gagal mengambil data dari Odesli (Song.link):", err);
    return null;
  }
};