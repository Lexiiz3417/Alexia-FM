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

// 🌟 ANTI-COCOKLOGI VERIFIER
// Ngecek apakah judul asli masih "nyambung" sama hasil dari Deezer
function verifyMatch(inputTitle, resultTitle) {
    if (!inputTitle || !resultTitle) return false;
    const t1 = inputTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const t2 = resultTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    return t1.includes(t2) || t2.includes(t1);
}

export async function getTrackInfo(rawTitle, rawArtist) {
    const { cleanTitle, cleanArtist } = cleanMetadata(rawTitle, rawArtist);
    const searchQuery = encodeURIComponent(`${cleanTitle} ${cleanArtist}`.trim());

    // --- LAPIS 1: DEEZER ---
    try {
        const dzUrl = `https://api.deezer.com/search?q=${searchQuery}&limit=3`; 
        const res = await fetch(dzUrl);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            // Cari hasil yang judulnya BENERAN mirip (bukan cocoklogi)
            const validTrack = data.data.find(t => verifyMatch(cleanTitle, t.title));
            
            if (validTrack) {
                return {
                    title: validTrack.title,
                    artist: validTrack.artist.name,
                    coverUrl: validTrack.album.cover_xl 
                };
            } else {
                console.log(`⚠️ Deezer hasil ngawur (Cocoklogi). Input: "${cleanTitle}". Di-skip!`);
            }
        }
    } catch (e) {
        console.error("⚠️ Deezer API Error:", e.message);
    }

    // --- LAPIS 2: iTUNES ---
    try {
        const itunesUrl = `https://itunes.apple.com/search?term=${searchQuery}&entity=song&limit=3`;
        const res = await fetch(itunesUrl);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            const validTrack = data.results.find(t => verifyMatch(cleanTitle, t.trackName));
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