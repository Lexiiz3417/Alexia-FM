// src/imageProcessor.js

import fetch from 'node-fetch';
import sharp from 'sharp';

/**
 * Helper: Memotong teks agar turun baris (Word Wrap)
 */
function wrapText(text, maxChars) {
  const words = text.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    // Cek apakah kalau ditambah kata berikutnya masih muat dalam batas karakter?
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
 * Membuat Kartu Musik Estetik (Sharp + SVG Overlay)
 * Fitur: Blur Mulus, Support Kanji, Layout Rapi (Judul & Artis di-wrap).
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
    
    // --- KONFIGURASI LAYOUT ---
    // REVISI FINAL:
    const MAX_TITLE_CHARS = 15;  
    const MAX_ARTIST_CHARS = 28; 
    const WATERMARK_TEXT = "@alexiazaphyra";
    
    // Sanitize text untuk SVG
    const sanitize = (str) => str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Unknown';
    const safeTitle = sanitize(title);
    const safeArtist = sanitize(artist);

    // Logic Top Text
    let headerText = "NOW PLAYING";
    if (topText) {
         if (!isNaN(topText) || typeof topText === 'number') {
             headerText = `DAY #${topText}`;
         } else {
             headerText = topText.toUpperCase().startsWith("DAY #") ? topText.toUpperCase() : topText.toUpperCase();
         }
    }

    // --- PROSES WRAPPING TEKS (JUDUL & ARTIS) ---

    // 1. Wrap Judul
    const titleLines = wrapText(safeTitle, MAX_TITLE_CHARS);
    let titleSvg = '';
    let currentY = 250; // Posisi Y awal judul
    
    titleLines.forEach((line, index) => {
        if (index === 0) {
            titleSvg += `<tspan x="550" y="${currentY}">${line}</tspan>`;
        } else {
            titleSvg += `<tspan x="550" dy="80">${line}</tspan>`; // Jarak antar baris judul
            currentY += 80;
        }
    });

    // 2. Wrap Artis (INI PERBAIKAN UTAMANYA)
    let artistY = currentY + 60; // Jarak awal Artis dari Judul terakhir
    const artistLines = wrapText(safeArtist, MAX_ARTIST_CHARS);
    let artistSvg = '';

    artistLines.forEach((line, index) => {
        if (index === 0) {
            // Baris pertama artis
            artistSvg += `<tspan x="550" y="${artistY}">${line}</tspan>`;
        } else {
            // Baris kedua dst. (dy lebih kecil karena font lebih kecil)
            artistSvg += `<tspan x="550" dy="50">${line}</tspan>`;
            // Kita tidak perlu update artistY lagi karena dy sudah menanganinya relatif
        }
    });


    // --- PROSES GAMBAR ---

    // 2. BACKGROUND PROCESSING (Blur effect mulus pake Sharp)
    const background = await sharp(originalBuffer)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
      .blur(40)
      .modulate({ brightness: 0.6 })
      .toBuffer();

    // 3. FOREGROUND (Cover Album Asli)
    const foreground = await sharp(originalBuffer)
      .resize(COVER_SIZE, COVER_SIZE, { fit: 'cover' })
      .toBuffer();

    // 4. SVG TEXT OVERLAY
    const textSvg = `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
        <style>
          /* FONT STACK: Prioritas JetBrains -> Noto CJK (Kanji) -> System */
          .font-style { 
             font-family: 'JetBrains Mono', 'Noto Sans CJK JP', 'Noto Sans CJK SC', monospace, sans-serif; 
          }

          .top-text { 
            fill: #f1c40f; font-size: 28px; font-weight: bold; letter-spacing: 4px; 
          }
          .title { 
            fill: #ffffff; font-size: 65px; font-weight: 800; 
          }
          .artist { 
            fill: #cccccc; font-size: 40px; font-weight: 600; 
          }
          .watermark {
            fill: rgba(255, 255, 255, 0.4); font-size: 20px; font-weight: normal; text-anchor: end;
          }
        </style>
        
        <text x="550" y="180" class="font-style top-text">${headerText}</text>

        <text class="font-style title">${titleSvg}</text>
        
        <text class="font-style artist">${artistSvg}</text>

        <text x="1150" y="605" class="font-style watermark">${WATERMARK_TEXT}</text>
      </svg>
    `;

    // 5. GABUNGKAN SEMUA
    const finalImage = await sharp(background)
      .composite([
        { input: foreground, top: Math.floor((CARD_HEIGHT - COVER_SIZE) / 2), left: 50 },
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

// Fungsi crop lama
export async function cropToSquare(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const originalBuffer = Buffer.from(await response.arrayBuffer());
        return await sharp(originalBuffer).resize(500, 500, { fit: 'cover' }).png().toBuffer();
    } catch (e) { return null; }
}