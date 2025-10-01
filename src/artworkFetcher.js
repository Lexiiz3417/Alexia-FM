// src/artworkFetcher.js
import fetch from 'node-fetch';

/**
 * Mencari cover art resolusi tinggi dari iTunes API.
 * @param {string} title Judul lagu.
 * @param {string} artist Nama artis.
 * @returns {Promise<string|null>} URL artwork atau null jika tidak ditemukan.
 */
export async function getHighResArtwork(title, artist) {
  // Membersihkan judul lagu dari embel-embel seperti "(Official Video)"
  const cleanTitle = title.replace(/\(.*(video|lyric|audio|visualizer).*\)/i, '').trim();
  const searchTerm = `${cleanTitle} ${artist}`;
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=1`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.resultCount > 0 && data.results[0].artworkUrl100) {
      const artworkUrl = data.results[0].artworkUrl100;
      // Mengganti '100x100' dengan '600x600' untuk resolusi lebih tinggi
      const highResUrl = artworkUrl.replace('100x100', '600x600');
      console.log(`✅ Found high-res artwork for "${title}" from iTunes.`);
      return highResUrl;
    }
    
    console.log(`🟡 No high-res artwork found on iTunes for "${title}". Falling back to YouTube thumbnail.`);
    return null;

  } catch (error) {
    console.error('❌ Error fetching from iTunes API:', error);
    return null;
  }
}