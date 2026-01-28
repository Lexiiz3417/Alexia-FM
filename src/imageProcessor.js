// src/imageProcessor.js

import fetch from 'node-fetch';
import sharp from 'sharp';

/**
 * Helper to wrap text.
 */
function wrapText(text, maxChars) {
  const words = text.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    if (currentLine.length + 1 + words[i].length <= maxChars) {
      currentLine += ' ' + words[i];
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Creates a static music card using Sharp + SVG Overlay
 * Supports CJK Fonts via fallback
 */
export async function createMusicCard({ imageUrl, title, artist, topText }) {
  try {
    // 1. Download Gambar
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    const CARD_WIDTH = 1200;
    const CARD_HEIGHT = 630;
    const COVER_SIZE = 450;
    
    // Konfigurasi Teks
    const MAX_TITLE_CHARS = 16; 
    const WATERMARK_TEXT = "@alexiazaphyra";
    
    // Sanitize input untuk SVG (cegah error karakter aneh)
    const sanitize = (str) => str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Unknown';
    const safeTitle = sanitize(title);
    const safeArtist = sanitize(artist);

    // Prepare Top Text (Day Number / Custom Tag)
    // Logika adaptif: Kalau angka, tambah "DAY #". Kalau teks biasa, uppercase aja.
    let headerText = "NOW PLAYING";
    if (topText) {
         if (!isNaN(topText) || typeof topText === 'number') {
             headerText = `DAY #${topText}`;
         } else {
             // Cek kalau formatnya sudah "DAY #...", biarkan. Kalau belum, uppercase.
             headerText = topText.toUpperCase().startsWith("DAY #") ? topText.toUpperCase() : topText.toUpperCase();
         }
    }

    // Wrap Title (Biar gak bablas)
    const titleLines = wrapText(safeTitle, MAX_TITLE_CHARS);
    
    // Positioning SVG Tspan
    let titleSvg = '';
    let currentY = 250; 
    
    titleLines.forEach((line, index) => {
        if (index === 0) {
            titleSvg += `<tspan x="550" y="${currentY}">${line}</tspan>`;
        } else {
            // Jarak antar baris
            titleSvg += `<tspan x="550" dy="80">${line}</tspan>`;
            currentY += 80;
        }
    });

    const artistY = currentY + 60; // Jarak Artist dari Judul terakhir

    // 2. BACKGROUND PROCESSING (Pake Sharp blur bawaan -> Mulus)
    const background = await sharp(originalBuffer)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
      .blur(40) // Blur level tinggi
      .modulate({ brightness: 0.6 }) // Gelapkan background biar teks kontras
      .toBuffer();

    // 3. FOREGROUND (Cover Album Asli)
    const foreground = await sharp(originalBuffer)
      .resize(COVER_SIZE, COVER_SIZE, { fit: 'cover' })
      .toBuffer();

    // 4. SVG TEXT OVERLAY (Dengan Font Stack Kanji)
    // Perhatikan bagian font-family di CSS bawah ini
    const textSvg = `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
        <style>
          /* FONT STACK PENTING:
             1. JetBrains Mono (Utama, sudah diinstall)
             2. Noto Sans CJK JP (Backup Kanji, sudah diinstall)
             3. monospace / sans-serif (Fallback sistem)
          */
          .font-style { 
             font-family: 'JetBrains Mono', 'Noto Sans CJK JP', 'Noto Sans CJK SC', monospace, sans-serif; 
          }

          .top-text { 
            fill: #f1c40f; 
            font-size: 28px; 
            font-weight: bold; 
            letter-spacing: 4px; 
          }
          
          .title { 
            fill: #ffffff; 
            font-size: 65px; 
            font-weight: 800; 
          }
          
          .artist { 
            fill: #cccccc; 
            font-size: 40px; 
            font-weight: 600; 
          }
          
          .watermark {
            fill: rgba(255, 255, 255, 0.4); 
            font-size: 20px;
            font-weight: normal;
            text-anchor: end;
          }
        </style>
        
        <text x="550" y="180" class="font-style top-text">${headerText}</text>

        <text class="font-style title">${titleSvg}</text>
        
        <text x="550" y="${artistY}" class="font-style artist">${safeArtist}</text>

        <text x="1170" y="605" class="font-style watermark">${WATERMARK_TEXT}</text>
      </svg>
    `;

    // 5. COMPOSITING (Gabungkan Semua)
    const finalImage = await sharp(background)
      .composite([
        // Layer 1: Cover Album di Kiri (dengan sedikit padding margin)
        { input: foreground, top: Math.floor((CARD_HEIGHT - COVER_SIZE) / 2), left: 50 },
        // Layer 2: Teks SVG di atas semuanya
        { input: Buffer.from(textSvg), top: 0, left: 0 }
      ])
      .png()
      .toBuffer();

    return finalImage;

  } catch (error) {
    console.error('❌ Failed to generate music card:', error);
    return null;
  }
}

// Keep legacy crop function just in case
export async function cropToSquare(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const originalBuffer = Buffer.from(await response.arrayBuffer());
        return await sharp(originalBuffer)
            .resize(500, 500, { fit: 'cover' }) // Simplified crop logic
            .png()
            .toBuffer();
    } catch (e) { return null; }
}