// src/coverFinder.js
import fetch from 'node-fetch';

export function cleanMetadata(rawTitle, rawArtist) {
    let title = rawTitle || "";
    let artist = rawArtist || "";

    // 1. Filter out placeholder artists (Topic, Release, Various Artists)
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

    // 🌟 2. BILINGUAL SPLITTER (Clean Kanji - English dual titles)
    if (title.includes(' - ') || title.includes(' / ')) {
        const separator = title.includes(' - ') ? ' - ' : ' / ';
        const parts = title.split(separator);
        
        // Regex to detect CJK characters (Japanese/Korean/Chinese)
        const hasCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/.test(parts[0]);
        
        if (hasCJK && parts.length >= 2) {
            title = parts.slice(1).join(separator).trim();
            console.log(`🧹 Bilingual detected! Cleaned title to: "${title}"`);
        }
    }

    // 3. Clean up generic tags (Official, MV, Audio, etc.)
    title = title.replace(/\s*[\(\[].*?(official|video|audio|lyric|mv|visualizer).*?[\)\]]\s*/gi, '').trim();

    return { cleanTitle: title, cleanArtist: artist };
}

// 🌟 SUPER VERIFIER: Check Title AND Artist Match!
function verifyMatch(inputTitle, inputArtist, resultTitle, resultArtist) {
    if (!inputTitle || !resultTitle) return false;
    
    const t1 = inputTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const t2 = resultTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const titleMatch = t1.includes(t2) || t2.includes(t1);

    // If the artist is empty (removed by filter), only pass if title is long/specific
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

    // 🛡️ MISMATCH PREVENTION ("THE CALL" SYNDROME)
    if (!cleanArtist && cleanTitle.length <= 10) {
        console.log(`⚠️ Mismatch Risk! Title "${cleanTitle}" is too short and lacks an artist. Skipping API.`);
        return null;
    }

    const searchQuery = encodeURIComponent(`${cleanTitle} ${cleanArtist}`.trim());

    // --- LAYER 1: DEEZER ---
    try {
        const dzUrl = `https://api.deezer.com/search?q=${searchQuery}&limit=5`; 
        const res = await fetch(dzUrl);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            const validTrack = data.data.find(t => verifyMatch(cleanTitle, cleanArtist, t.title, t.artist.name));
            
            if (validTrack) {
                // 🌟 FIX: Return the original clean metadata, ONLY borrow the cover URL!
                return {
                    title: cleanTitle,
                    artist: cleanArtist,
                    coverUrl: validTrack.album.cover_xl 
                };
            } else {
                console.log(`⚠️ Deezer mismatch. Input: "${cleanTitle} - ${cleanArtist}". Skipped!`);
            }
        }
    } catch (e) {
        console.error("⚠️ Deezer API Error:", e.message);
    }

    // --- LAYER 2: iTUNES ---
    try {
        const itunesUrl = `https://itunes.apple.com/search?term=${searchQuery}&entity=song&limit=5`;
        const res = await fetch(itunesUrl);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            const validTrack = data.results.find(t => verifyMatch(cleanTitle, cleanArtist, t.trackName, t.artistName));
            if (validTrack) {
                // 🌟 FIX: Return the original clean metadata, ONLY borrow the cover URL!
                return {
                    title: cleanTitle,
                    artist: cleanArtist,
                    coverUrl: validTrack.artworkUrl100.replace('100x100bb', '1000x1000bb') 
                };
            }
        }
    } catch (e) {
        console.error("⚠️ iTunes API Error:", e.message);
    }

    return null; 
}

// 💉 HD COVER FALLBACK FOR YOUTUBE
export function forceHDYouTubeCover(coverUrl) {
    if (!coverUrl) return coverUrl;

    if (coverUrl.includes('googleusercontent.com') && coverUrl.includes('=')) {
        return coverUrl.split('=')[0] + '=w1000-h1000-l90-rj';
    } 
    else if (coverUrl.includes('i.ytimg.com')) {
        return coverUrl.replace(/hqdefault\.jpg|mqdefault\.jpg|sddefault\.jpg/g, 'maxresdefault.jpg');
    }
    
    return coverUrl;
}