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
 * Creates a static music card with a watermark.
 */
export async function createMusicCard({ imageUrl, title, artist, day }) {
  try {
    const response = await fetch(imageUrl);
    const originalBuffer = Buffer.from(await response.arrayBuffer());

    const CARD_WIDTH = 1200;
    const CARD_HEIGHT = 630;
    const COVER_SIZE = 450;
    const MAX_TZ_CHARS = 18; 
    
    // Watermark Configuration
    const WATERMARK_TEXT = "@alexiazaphyra";
    
    const sanitize = (str) => str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Unknown';
    const safeTitle = sanitize(title);
    const safeArtist = sanitize(artist);

    // Prepare Day/Top Text
    let topText = '';
    if (day) {
        topText = (typeof day === 'number' || !isNaN(day)) ? `DAY #${day}` : day.toUpperCase();
    }

    // Wrap Title
    const titleLines = wrapText(safeTitle, MAX_TZ_CHARS);
    
    // Positioning
    let titleSvg = '';
    let currentY = 250; // Start title here
    
    titleLines.forEach((line, index) => {
        if (index === 0) {
            titleSvg += `<tspan x="550" y="${currentY}">${line}</tspan>`;
        } else {
            titleSvg += `<tspan x="550" dy="70">${line}</tspan>`;
            currentY += 70;
        }
    });

    const artistY = currentY + 80;

    // --- IMAGE PROCESSING ---
    const background = await sharp(originalBuffer)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
      .blur(40)
      .modulate({ brightness: 0.6 })
      .toBuffer();

    const foreground = await sharp(originalBuffer)
      .resize(COVER_SIZE, COVER_SIZE, { fit: 'cover' })
      .toBuffer();

    // UPDATE: Font Family diganti jadi 'Liberation Sans' biar mirip Arial
    const textSvg = `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
        <style>
          .top-text { fill: #f1c40f; font-size: 28px; font-family: 'Liberation Sans', Arial, sans-serif; font-weight: bold; letter-spacing: 4px; }
          .title { fill: #ffffff; font-size: 60px; font-family: 'Liberation Sans', Arial, sans-serif; font-weight: bold; }
          .artist { fill: #cccccc; font-size: 40px; font-family: 'Liberation Sans', Arial, sans-serif; font-weight: normal; }
          
          /* Style untuk Watermark */
          .watermark {
            fill: rgba(255, 255, 255, 0.4); 
            font-size: 22px;
            font-family: 'Liberation Sans', Arial, sans-serif;
            font-weight: normal;
            text-anchor: end;
          }
        </style>
        
        <text x="550" y="180" class="top-text">${topText}</text>

        <text class="title">${titleSvg}</text>
        <text x="550" y="${artistY}" class="artist">${safeArtist}</text>

        <text x="1170" y="605" class="watermark">${WATERMARK_TEXT}</text>
      </svg>
    `;

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

// Keep legacy crop function
export async function cropToSquare(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const originalBuffer = Buffer.from(await response.arrayBuffer());
        const metadata = await sharp(originalBuffer).metadata();
        const size = Math.min(metadata.width, metadata.height);
        const top = Math.floor((metadata.height - size) / 2);
        const left = Math.floor((metadata.width - size) / 2);
        return await sharp(originalBuffer).extract({ left, top, width: size, height: size }).png().toBuffer();
    } catch (e) { return null; }
}