// src/imageAPI.js

import fetch from 'node-fetch';

/**
 * Mengambil URL GIF untuk aksi tertentu dari API waifu.pics.
 * @param {string} action - Nama aksi yang diinginkan (contoh: 'slap', 'hug').
 * @returns {Promise<string|null>} URL dari GIF, atau null jika terjadi error.
 */
export async function getActionGif(action) {
  try {
    const apiUrl = `https://api.waifu.pics/sfw/${action}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API waifu.pics returned status: ${response.status}`);
    }
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error(`Gagal mengambil GIF untuk aksi "${action}":`, error);
    return null;
  }
}

/**
 * Mencari gambar/GIF dari Danbooru dan MENGEMBALIKAN ratingnya.
 * @param {Object} options - Opsi pencarian.
 * @param {string[]} [options.tags=[]] - Array berisi tag yang dicari.
 * @param {boolean} [options.isGif=false] - Set true untuk mencari GIF.
 * @returns {Promise<object|string|null>} Objek berisi { file_url, rating }, atau 'not_found' atau null.
 */
export async function searchDanbooru({ tags = [], isGif = false } = {}) {
  try {
    const searchTags = [...tags];

    if (isGif) {
      searchTags.push('filetype:gif');
    }
    
    const tagQuery = searchTags.join('+');
    const apiUrl = `https://danbooru.donmai.us/posts.json?tags=${tagQuery}&limit=20&random=true`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`API Danbooru returned status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0 && data[0].file_url) {
      const post = data[0];
      return { file_url: post.file_url, rating: post.rating };
    }
    
    return 'not_found';

  } catch (error) { // <-- PERBAIKAN DI SINI, kurung kurawal ditambahkan
    console.error(`Gagal melakukan pencarian di Danbooru:`, error);
    return null;
  }
}