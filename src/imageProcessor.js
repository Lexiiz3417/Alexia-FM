// src/imageProcessor.js

import fetch from 'node-fetch';
import sharp from 'sharp';

/**
 * Mengunduh gambar dan memotong bagian tengahnya menjadi persegi.
 * @param {string} imageUrl URL gambar yang akan diproses.
 * @returns {Promise<Buffer|null>} Buffer gambar yang sudah dipotong, atau null jika gagal.
 */
export async function cropToSquare(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    const originalBuffer = Buffer.from(await response.arrayBuffer());

    const metadata = await sharp(originalBuffer).metadata();

    const size = Math.min(metadata.width, metadata.height);

    const top = Math.floor((metadata.height - size) / 2);
    const left = Math.floor((metadata.width - size) / 2);

    const croppedBuffer = await sharp(originalBuffer)
      .extract({ left: left, top: top, width: size, height: size })
      .png()
      .toBuffer();
      
    return croppedBuffer;

  } catch (error) {
    console.error('❌ Gagal memotong gambar dengan metode extract:', error);
    return null;
  }
}