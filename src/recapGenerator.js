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

// --- HELPER 1: CARI COVER JUARA 1 (3 LAPIS PELINDUNG) ---
async function getCoverWinner(title, artist) {
    if (!title || !artist) return null;
    const query = encodeURIComponent(`${title} ${artist}`);

    // LAPIS 1: Coba cari di YouTube Music / Playlist lu
    try {
        const playlist = await getPlaylistTracks();
        const found = playlist.find(t => {
            const tTitle = (t.title || "").toLowerCase();
            const sTitle = title.toLowerCase();
            return tTitle.includes(sTitle) || sTitle.includes(tTitle);
        });
        if (found && found.thumbnails && found.thumbnails.length > 0) {
            return found.thumbnails[found.thumbnails.length - 1].url.replace(/=w\d+-h\d+.*/, '=w1200-h1200-l100-rj');
        }
    } catch (e) {
        console.log("⚠️ YT Playlist error, mencoba lapis 2...");
    }

    // LAPIS 2: Coba cari pakai Odesli API
    try {
        const searchData = await getOdesliData(`https://music.youtube.com/search?q=${query}`);
        if (searchData && searchData.imageUrl) {
            return searchData.imageUrl;
        }
    } catch (e) {
        console.log("⚠️ Odesli error, mencoba lapis 3...");
    }

    // LAPIS 3: Fallback Paling Gacor -> iTunes / Apple Music API (Anti-mati)
    try {
        const itunesUrl = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;
        const res = await fetch(itunesUrl);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            // Apple ngasih ukuran 100x100, kita retas linknya biar ngasih resolusi HD 600x600
            return data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        }
    } catch (e) {
        console.log("⚠️ iTunes API error.");
    }

    // Kalau 3 lapis jebol semua, baru return null (buat trigger placeholder ALEXIA FM)
    return null; 
}

// --- HELPER 2: SHARP CONVERTER (Ubah WebP ke PNG & Bikin Efek Blur) ---
async function prepareImages(url) {
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (!res.ok) return null; // Cegah error kalau server ngasih 404/Forbidden
        
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

// --- MESIN UTAMA: CANVAS ---
export async function generateRecapImage(type, songs) {
    const width = 800;
    const height = 1000;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const mainFont = '"JetBrains Mono"'; 
    const accentColor = '#FFD700';
    
    const topSong = songs[0] || { title: "Unknown", artist: "Unknown", play_count: 0 };
    let finalImages = null;
    
    // Placeholder anti-mati (Background gelap, teks Kuning Gold)
    const defaultCoverUrl = 'https://placehold.co/600x600/1a1a1a/FFD700.png?text=ദ്ദി(˵ •̀ ᴗ - ˵ ) ✧'; 

    // --- 1. PROSES GAMBAR DENGAN SHARP ---
    if (topSong.title !== "Unknown") {
        let coverUrl = await getCoverWinner(topSong.title, topSong.artist);
        
        if (coverUrl) finalImages = await prepareImages(coverUrl);
        // Kalau cover asli gagal diproses Sharp, pake placeholder
        if (!finalImages) finalImages = await prepareImages(defaultCoverUrl);
    }

    // --- 2. RENDER BACKGROUND ---
    if (finalImages && finalImages.bgImg) {
        ctx.drawImage(finalImages.bgImg, 0, 0, width, height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Extra layer gelap tipis biar teks kebaca
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