// src/coverFinder.js
import fetch from 'node-fetch';

function cleanMetadata(rawTitle, rawArtist) {
    let title = rawTitle || "";
    let artist = rawArtist || "";

    const isBadArtist = artist.toLowerCase().includes('topic') || 
                        artist.toLowerCase() === 'release' || 
                        artist.toLowerCase() === 'various artists';

    if (isBadArtist) {
        if (title.includes(' - ')) {
            const parts = title.split(' - ');
            artist = parts[0].trim(); 
            title = parts.slice(1).join(' - ').trim(); 
        } else {
            artist = ""; 
        }
    }

    title = title.replace(/\s*[\(\[].*?(official|video|audio|lyric|mv|visualizer).*?[\)\]]\s*/gi, '').trim();

    return { cleanTitle: title, cleanArtist: artist };
}

// 🌟 SUPER VERIFIER: Cek Judul DAN Artis!
function verifyMatch(inputTitle, inputArtist, resultTitle, resultArtist) {
    if (!inputTitle || !resultTitle) return false;
    
    const t1 = inputTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const t2 = resultTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const titleMatch = t1.includes(t2) || t2.includes(t1);

    // Kalo artisnya kosong (karena dihapus filter), kita cuma lolosin kalo judulnya panjang (spesifik)
    // Kalo judul cuma 1-2 kata kayak "The Call" tanpa artis, itu 100% bakal cocoklogi.
    if (!inputArtist) {
        return titleMatch && inputTitle.length > 10; 
    }

    const a1 = inputArtist.toLowerCase().replace(/[^a-z0-9]/g, '');
    const a2 = (resultArtist || "").toLowerCase().replace(/[^a-z0-9]/g, '');
    const artistMatch = a1.includes(a2) || a2.includes(a1);

    return titleMatch && artistMatch;
}

export async function getTrackInfo(rawTitle, rawArtist) {
    const { cleanTitle, cleanArtist } = cleanMetadata(rawTitle, rawArtist);

    // 🛡️ PENANGKAL COCOKLOGI "THE CALL"
    // Kalo setelah dibersihin artisnya ilang dan judulnya pasaran (<= 10 huruf), mending nyerah!
    if (!cleanArtist && cleanTitle.length <= 10) {
        console.log(`⚠️ Bahaya Cocoklogi! Judul "${cleanTitle}" terlalu pendek dan tanpa artis. Skip API.`);
        return null;
    }

    const searchQuery = encodeURIComponent(`${cleanTitle} ${cleanArtist}`.trim());

    // --- LAPIS 1: DEEZER ---
    try {
        const dzUrl = `https://api.deezer.com/search?q=${searchQuery}&limit=5`; 
        const res = await fetch(dzUrl);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            // Cek bener-bener yang match Judul & Artis
            const validTrack = data.data.find(t => verifyMatch(cleanTitle, cleanArtist, t.title, t.artist.name));
            
            if (validTrack) {
                return {
                    title: validTrack.title,
                    artist: validTrack.artist.name,
                    coverUrl: validTrack.album.cover_xl 
                };
            } else {
                console.log(`⚠️ Deezer hasil ngawur. Input: "${cleanTitle} - ${cleanArtist}". Di-skip!`);
            }
        }
    } catch (e) {
        console.error("⚠️ Deezer API Error:", e.message);
    }

    // --- LAPIS 2: iTUNES ---
    try {
        const itunesUrl = `https://itunes.apple.com/search?term=${searchQuery}&entity=song&limit=5`;
        const res = await fetch(itunesUrl);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            const validTrack = data.results.find(t => verifyMatch(cleanTitle, cleanArtist, t.trackName, t.artistName));
            if (validTrack) {
                return {
                    title: validTrack.trackName,
                    artist: validTrack.artistName,
                    coverUrl: validTrack.artworkUrl100.replace('100x100bb', '1000x1000bb') 
                };
            }
        }
    } catch (e) {
        console.error("⚠️ iTunes API Error:", e.message);
    }

    return null; 
}