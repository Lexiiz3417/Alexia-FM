// src/recapGenerator.js

import { createCanvas, loadImage, registerFont } from 'canvas';
import sharp from 'sharp';
import fetch from 'node-fetch';
import { getOdesliData } from './songlink.js';
import { getPlaylistTracks } from './ytmusic.js';
import path from 'path';
import { fileURLToPath } from 'url';

// --- MANTRA JALAN NINJA (LOAD FONT LOKAL) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
try {
    const fontPath = path.join(__dirname, '../fonts/JetBrainsMono-Bold.ttf');
    registerFont(fontPath, { family: 'JetBrains Mono' });
} catch (e) {
    console.error("❌ Gagal load font lokal:", e.message);
}

// Helper 1: Cari Cover Juara 1
async function getCoverWinner(title, artist) {
    if (!title || !artist) return null;
    try {
        const playlist = await getPlaylistTracks();
        const found = playlist.find(t => {
            const tTitle = (t.title || "").toLowerCase();
            const sTitle = title.toLowerCase();
            return tTitle.includes(sTitle) || sTitle.includes(tTitle);
        });
        if (found) return found.thumbnails[found.thumbnails.length - 1].url.replace(/=w\d+-h\d+.*/, '=w1200-h1200-l100-rj');

        const searchData = await getOdesliData(`https://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`);
        return searchData?.imageUrl || null;
    } catch (e) { return null; }
}

// Helper 2: Sharp Converter (Ubah WebP ke PNG & Bikin Efek Blur)
async function prepareImages(url) {
    if (!url) return null;
    try {
        const res = await fetch(url);
        // FIX: Kalau servernya ngasih 404, langsung batalin, jangan diproses!
        if (!res.ok) return null; 
        
        const buffer = Buffer.from(await res.arrayBuffer());

        const bgBuffer = await sharp(buffer)
            .resize(800, 1000, { fit: 'cover' })
            .blur(40) 
            .modulate({ brightness: 0.4 }) 
            .png() 
            .toBuffer();

        const fgBuffer = await sharp(buffer)
            .resize(320, 320, { fit: 'cover' })
            .png()
            .toBuffer();

        return {
            bgImg: await loadImage(bgBuffer),
            fgImg: await loadImage(fgBuffer)
        };
    } catch (e) {
        console.error("Sharp Converter Error:", e.message);
        return null;
    }
}

// MESIN UTAMA: CANVAS
export async function generateRecapImage(type, songs) {
    const width = 800;
    const height = 1000;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const mainFont = '"JetBrains Mono"'; 
    const accentColor = '#FFD700';
    
    const topSong = songs[0] || { title: "Unknown", artist: "Unknown", play_count: 0 };
    let finalImages = null;
    
    // FIX: Pakai Placeholder anti-mati (Warna background gelap, teks Kuning Gold)
    const defaultCoverUrl = 'https://placehold.co/400x400/1a1a1a/FFD700.png?text=ALEXIA+FM'; 

    // --- 1. PROSES GAMBAR DENGAN SHARP ---
    if (topSong.title !== "Unknown") {
        let coverUrl = await getCoverWinner(topSong.title, topSong.artist);
        
        if (coverUrl) finalImages = await prepareImages(coverUrl);
        if (!finalImages) finalImages = await prepareImages(defaultCoverUrl);
    }

    // --- 2. RENDER BACKGROUND ---
    if (finalImages && finalImages.bgImg) {
        ctx.drawImage(finalImages.bgImg, 0, 0, width, height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Extra layer gelap tipis
        ctx.fillRect(0, 0, width, height);
    } else {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0f0f0f');
        grad.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

    // --- 3. HEADER ---
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 32px ${mainFont}`;
    ctx.fillText(`ALEXIA ${type} RECAP`, width / 2, 80);
    
    ctx.fillStyle = accentColor;
    ctx.font = `20px ${mainFont}`;
    ctx.fillText(new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }), width / 2, 115);

    // --- 4. TOP 1 SECTION ---
    if (topSong.title !== "Unknown") {
        const coverSize = 320;
        const x = (width - coverSize) / 2;
        const y = 160;

        if (finalImages && finalImages.fgImg) {
            ctx.shadowBlur = 40; 
            ctx.shadowColor = 'rgba(255, 215, 0, 0.2)';
            ctx.drawImage(finalImages.fgImg, x, y, coverSize, coverSize);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#333'; ctx.fillRect(x, y, coverSize, coverSize);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 38px ${mainFont}`;
        ctx.fillText(topSong.title, width / 2, 535);
        
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = `24px ${mainFont}`;
        ctx.fillText(topSong.artist, width / 2, 575);
        
        ctx.fillStyle = accentColor;
        ctx.font = `bold 22px ${mainFont}`;
        ctx.fillText(`TOP 1 • ${topSong.play_count} PLAYS THIS ${type}`, width / 2, 615);
    }

    // --- 5. LIST RANKING ---
    const listStartTop = 680; 
    songs.slice(1).forEach((song, index) => {
        const rank = index + 2;
        const y = listStartTop + (index * 62);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        if (ctx.roundRect) { ctx.roundRect(80, y - 42, width - 160, 52, 10); } 
        else { ctx.rect(80, y - 42, width - 160, 52); }
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.fillStyle = rank === 2 ? accentColor : (rank === 3 ? '#C0C0C0' : '#ffffff');
        ctx.font = `bold 22px ${mainFont}`;
        ctx.fillText(`${rank}`, 110, y - 6);

        ctx.fillStyle = '#ffffff';
        ctx.font = `18px ${mainFont}`;
        const info = `${song.title || 'Unknown'} - ${song.artist || 'Unknown'}`;
        ctx.fillText(info.length > 40 ? info.substring(0, 37) + '...' : info, 160, y - 6);

        ctx.textAlign = 'right';
        ctx.fillStyle = accentColor;
        ctx.font = `bold 16px ${mainFont}`;
        ctx.fillText(`${song.play_count || 0} PTS`, width - 110, y - 6);
    });

    // --- 6. FOOTER WATERMARK ---
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = `italic 16px ${mainFont}`;
    ctx.fillText('powered by @alexiazaphyra', width / 2, height - 35);

    return canvas.toBuffer();
}