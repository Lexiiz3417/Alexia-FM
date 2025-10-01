// src/imageProcessor.js
import fetch from 'node-fetch';
import sharp from 'sharp';

export async function cropToSquare(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    const originalBuffer = await response.buffer();

    const metadata = await sharp(originalBuffer).metadata();
    const size = Math.min(metadata.width, metadata.height);

    const croppedBuffer = await sharp(originalBuffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center' 
      })
      .png()
      .toBuffer();

    return croppedBuffer;

  } catch (error) {
    console.error('❌ Gagal memotong gambar:', error);
    return null;
  }
}