// src/coverFinder.js
import fetch from 'node-fetch';

function cleanMetadata(rawTitle, rawArtist) {
    let title = rawTitle || "";
    let artist = rawArtist || "";

    // 1. Deteksi penyakit YouTube Music
    const isBadArtist = artist.toLowerCase().includes('topic') || 
                        artist.toLowerCase() === 'release' || 
                        artist.toLowerCase() === 'various artists';

    if (isBadArtist) {
        // Kalau nama artisnya ngaco, kita cek apakah judulnya pake format "Artis - Judul"
        if (title.includes(' - ')) {
            const parts = title.split(' - ');
            artist = parts[0].trim(); // Ambil bagian depan sebagai artis
            title = parts.slice(1).join(' - ').trim(); // Sisanya jadi judul
        } else {
            // Kalau gak ada strip, kosongin aja artisnya biar Deezer nebak dari judul
            artist = ""; 
        }
    }

    // 2. Bersihin embel-embel video dari judul (misal: "[MV]", "(Official Audio)", dll)
    title = title.replace(/\s*[\(\[].*?(official|video|audio|lyric|mv|visualizer).*?[\)\]]\s*/gi, '').trim();

    return { cleanTitle: title, cleanArtist: artist };
}


export async function getTrackInfo(rawTitle, rawArtist) {
    // Bersihin teksnya dulu sebelum nyari
    const { cleanTitle, cleanArtist } = cleanMetadata(rawTitle, rawArtist);
    const searchQuery = encodeURIComponent(`${cleanTitle} ${cleanArtist}`.trim());

    // --- LAPIS 1: DEEZER API ---
    try {
        const dzUrl = `https://api.deezer.com/search?q=${searchQuery}&limit=1`;
        const res = await fetch(dzUrl);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            const track = data.data[0];
            return {
                title: track.title, 
                artist: track.artist.name, 
                coverUrl: track.album.cover_xl 
            };
        }
    } catch (e) {
        console.error("⚠️ Deezer API Error, turun ke Lapis 2...", e.message);
    }

    // --- LAPIS 2: iTUNES / APPLE MUSIC API (CADANGAN) ---
    try {
        const itunesUrl = `https://itunes.apple.com/search?term=${searchQuery}&entity=song&limit=1`;
        const res = await fetch(itunesUrl);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            const track = data.results[0];
            return {
                title: track.trackName,
                artist: track.artistName,
                // iTunes ngasih ukuran 100x100, kita "hack" URL-nya paksa jadi 1000x1000
                coverUrl: track.artworkUrl100.replace('100x100bb', '1000x1000bb') 
            };
        }
    } catch (e) {
        console.error("⚠️ iTunes API Error.", e.message);
    }

    // --- LAPIS 3: GAGAL SEMUA ---
    // Balikin null. Nanti di Phase 2, kalo dapet 'null', Canvas bakal otomatis nggambar LOGO ALEXIA FM.
    return null; 
}