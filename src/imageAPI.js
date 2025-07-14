// src/imageAPI.js

import fetch from 'node-fetch';

/**
 * Mengambil URL GIF untuk aksi tertentu dari API waifu.pics.
 * @param {string} action - Nama aksi yang diinginkan (contoh: 'slap', 'hug', 'kick').
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
 * Mencari gambar/GIF dari waifu.im berdasarkan tag dan filter.
 * @param {Object} options - Opsi pencarian.
 * @param {string[]} [options.tags=[]] - Array berisi tag yang dicari (contoh: ['maid', 'long_hair']).
 * @param {boolean} [options.isGif=false] - Set true untuk mencari GIF.
 * @returns {Promise<string|null>} URL dari gambar/GIF, atau null jika terjadi error.
 */
export async function searchWaifuIm({ tags = [], isGif = false } = {}) {
  try {
    // Membangun query parameter dengan rapi
    const params = new URLSearchParams();
    if (isGif) {
      params.append('is_gif', 'true');
    }
    if (tags.length > 0) {
      tags.forEach(tag => params.append('included_tags', tag));
    }
    
    const apiUrl = `https://api.waifu.im/search?${params}`;
    
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API waifu.im returned status: ${response.status}`);
    }

    const data = await response.json();

    // Pastikan ada gambar di dalam response
    if (data.images && data.images.length > 0) {
      return data.images[0].url; // Ambil URL dari gambar pertama
    }
    
    // Jika tidak ada gambar yang ditemukan
    return 'not_found';

  } catch (error) {
    console.error(`Gagal melakukan pencarian di waifu.im:`, error);
    return null;
  }
}