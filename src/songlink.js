// src/songlink.js

import fetch from "node-fetch";

/**
 * Mengambil data lagu bersih dengan prioritas platform dan membersihkan nama artis di akhir.
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

    // Prioritas 1: Apple Music
    const appleMusicLink = data.linksByPlatform.appleMusic;
    if (appleMusicLink) {
        bestEntity = data.entitiesByUniqueId[appleMusicLink.entityUniqueId];
        console.log("✅ Found clean data from Apple Music.");
    }

    // Prioritas 2: Spotify
    if (!bestEntity) {
        const spotifyLink = data.linksByPlatform.spotify;
        if (spotifyLink) {
            bestEntity = data.entitiesByUniqueId[spotifyLink.entityUniqueId];
            console.log("✅ Found clean data from Spotify.");
        }
    }

    // Prioritas 3: Fallback ke data default
    if (!bestEntity) {
        bestEntity = data.entitiesByUniqueId[data.entityUniqueId];
        console.log("🟡 No Apple Music/Spotify data. Falling back to default Odesli entity.");
    }

    if (!bestEntity) {
      console.warn("❌ Could not find any entity in Odesli response.");
      return null;
    }

       const cleanArtistName = bestEntity.artistName
        .replace(/(\s*-\s*Topic|\s*Official\s*Channel|\s*VEVO|\s?Official)$/i, '')
        .trim();

    return {
      pageUrl: data.pageUrl,
      title: bestEntity.title,
      artist: cleanArtistName,
      imageUrl: bestEntity.thumbnailUrl,
    };

  } catch (err) {
    console.error("❌ Gagal mengambil data dari Odesli (Song.link):", err);
    return null;
  }
};