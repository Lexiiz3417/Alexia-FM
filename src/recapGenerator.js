// src/recapGenerator.js

import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';
import fetch from 'node-fetch'; // Buat ngambil buffer gambar di Sharp
import { getOdesliData } from './songlink.js';
import { getPlaylistTracks } from './ytmusic.js';

// Helper: Ambil Cover Juara 1
async function getCoverWinner(title, artist) {
    if (!title || !artist) return null;
    try {
        const playlist = await getPlaylistTracks();
        const found = playlist.find(t => {
            const tTitle = (t.title || "").toLowerCase();
            const sTitle = title.toLowerCase();
            return tTitle.includes(sTitle) || sTitle.includes(tTitle);
        });
        if (found) return found.thumbnails[found.thumbnails.length - 1].url;

        const searchData = await getOdesliData(`https://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`);
        return searchData?.imageUrl || null;
    } catch (e) {
        return null;
    }
}

// Helper: Ubah URL jadi Buffer (Buat Sharp)
async function getBufferFromUrl(url) {
    if (!url) return null;
    try {
        const res = await fetch(url);
        return Buffer.from(await res.arrayBuffer());
    } catch (e) { return null; }
}

// Helper: Bersihkan teks dari karakter bahaya untuk SVG
const sanitize = (str) => {
    if (!str) return 'Unknown';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

// ==========================================
// MESIN 1: CANVAS GENERATOR
// ==========================================
export async function generateRecapCanvas(type, songs) {
    const width = 800;
    const height = 1000;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const mainFont = 'monospace';
    const accentColor = '#FFD700';
    
    const topSong = songs[0] || { title: "Unknown", artist: "Unknown", play_count: 0 };
    let winnerCoverImg = null;

    if (topSong.title !== "Unknown") {
        const coverUrl = await getCoverWinner(topSong.title, topSong.artist);
        if (coverUrl) {
            try { winnerCoverImg = await loadImage(coverUrl); } catch (e) {}
        }
    }

    if (winnerCoverImg) {
        ctx.drawImage(winnerCoverImg, 0, 0, width, height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
        ctx.fillRect(0, 0, width, height);
    } else {
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, width, height);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; 
    ctx.font = `italic 16px ${mainFont}`;
    ctx.fillText('@alexiazaphyra', width - 40, 45);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 32px ${mainFont}`;
    ctx.fillText(`ALEXIA ${type} RECAP (CANVAS)`, width / 2, 90);
    
    ctx.fillStyle = accentColor;
    ctx.font = `20px ${mainFont}`;
    ctx.fillText(new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }), width / 2, 125);

    if (topSong.title !== "Unknown") {
        const coverSize = 320;
        const x = (width - coverSize) / 2;
        const y = 190;

        if (winnerCoverImg) {
            ctx.shadowBlur = 50; ctx.shadowColor = 'rgba(255, 215, 0, 0.2)';
            ctx.drawImage(winnerCoverImg, x, y, coverSize, coverSize);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#333'; ctx.fillRect(x, y, coverSize, coverSize);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 38px ${mainFont}`;
        ctx.fillText(topSong.title, width / 2, 565);
        
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = `24px ${mainFont}`;
        ctx.fillText(topSong.artist, width / 2, 605);
        
        ctx.fillStyle = accentColor;
        ctx.font = `bold 22px ${mainFont}`;
        ctx.fillText(`🔥 ${topSong.play_count} PLAYS THIS ${type}`, width / 2, 645);
    }

    const listStartTop = 715;
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

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = `12px ${mainFont}`;
    ctx.fillText('GENERATED BY ALEXIA', width / 2, height - 35);

    return canvas.toBuffer();
}

// ==========================================
// MESIN 2: SHARP + SVG GENERATOR
// ==========================================
export async function generateRecapSharp(type, songs) {
    const width = 800;
    const height = 1000;
    const mainFont = 'monospace'; // Menggunakan fallback pintar ala Sharp
    const accentColor = '#FFD700';
    
    const topSong = songs[0] || { title: "Unknown", artist: "Unknown", play_count: 0 };
    const coverUrl = await getCoverWinner(topSong.title, topSong.artist);
    const coverBuffer = await getBufferFromUrl(coverUrl);

    // Bikin Background Blur (Atau warna solid gelap kalo gaada cover)
    let backgroundBuffer;
    if (coverBuffer) {
        backgroundBuffer = await sharp(coverBuffer)
            .resize(width, height, { fit: 'cover' })
            .blur(40)
            .modulate({ brightness: 0.4 }) // Gelapin dikit
            .toBuffer();
    } else {
        backgroundBuffer = await sharp({ create: { width, height, channels: 4, background: { r: 18, g: 18, b: 18, alpha: 1 } } }).png().toBuffer();
    }

    let composites = [];

    // Tumpuk Cover Asli di tengah
    if (coverBuffer) {
        const winnerCover = await sharp(coverBuffer)
            .resize(320, 320, { fit: 'cover' })
            .toBuffer();
        composites.push({ input: winnerCover, top: 190, left: (width - 320) / 2 });
    }

    // Bangun SVG Overlay Text & Shapes
    let svg = `<svg width="${width}" height="${height}">
        <style>
            .font { font-family: ${mainFont}, sans-serif; }
            .watermark { fill: rgba(255,255,255,0.2); font-size: 16px; font-style: italic; text-anchor: end; }
            .header { fill: #ffffff; font-size: 32px; font-weight: bold; text-anchor: middle; }
            .date { fill: ${accentColor}; font-size: 20px; text-anchor: middle; }
            .top-title { fill: #ffffff; font-size: 38px; font-weight: bold; text-anchor: middle; }
            .top-artist { fill: rgba(255,255,255,0.7); font-size: 24px; text-anchor: middle; }
            .top-plays { fill: ${accentColor}; font-size: 22px; font-weight: bold; text-anchor: middle; }
            .list-bg { fill: rgba(255,255,255,0.06); }
            .list-rank { font-size: 22px; font-weight: bold; }
            .list-info { fill: #ffffff; font-size: 18px; }
            .list-pts { fill: ${accentColor}; font-size: 16px; font-weight: bold; text-anchor: end; }
            .footer { fill: rgba(255,255,255,0.25); font-size: 12px; text-anchor: middle; }
        </style>
        
        <text x="760" y="45" class="font watermark">@alexiazaphyra</text>
        <text x="400" y="90" class="font header">ALEXIA ${type} RECAP (SHARP)</text>
        <text x="400" y="125" class="font date">${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</text>
        
        <text x="400" y="565" class="font top-title">${sanitize(topSong.title)}</text>
        <text x="400" y="605" class="font top-artist">${sanitize(topSong.artist)}</text>
        <text x="400" y="645" class="font top-plays">🔥 ${topSong.play_count || 0} PLAYS THIS ${type}</text>
    `;

    // Looping List sisanya
    const listStartTop = 715;
    songs.slice(1).forEach((song, index) => {
        const rank = index + 2;
        const y = listStartTop + (index * 62);
        const rankColor = rank === 2 ? accentColor : (rank === 3 ? '#C0C0C0' : '#ffffff');
        
        let info = `${song.title || 'Unknown'} - ${song.artist || 'Unknown'}`;
        if(info.length > 40) info = info.substring(0, 37) + '...';
        
        svg += `
            <rect x="80" y="${y - 42}" width="640" height="52" rx="10" class="list-bg" />
            <text x="110" y="${y - 6}" class="font list-rank" fill="${rankColor}">${rank}</text>
            <text x="160" y="${y - 6}" class="font list-info">${sanitize(info)}</text>
            <text x="690" y="${y - 6}" class="font list-pts">${song.play_count || 0} PTS</text>
        `;
    });

    svg += `<text x="400" y="965" class="font footer">GENERATED BY ALEXIA</text>
    </svg>`;

    composites.push({ input: Buffer.from(svg), top: 0, left: 0 });

    // Render Gambar Akhir
    const finalImage = await sharp(backgroundBuffer)
        .composite(composites)
        .png()
        .toBuffer();

    return finalImage;
}