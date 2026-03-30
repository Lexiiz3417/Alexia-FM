// src/coverFinder.js
import fetch from 'node-fetch';

function cleanMetadata(rawTitle, rawArtist) {
    let title = rawTitle || "";
    let artist = rawArtist || "";

    // 1. Filter Artis Bodong (Topic, Release, Various Artists)
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

    // 🌟 2. JURUS BILINGUAL SPLITTER (Pemusnah Judul Ganda Kanji - English) 🌟
    if (title.includes(' - ') || title.includes(' / ')) {
        const separator = title.includes(' - ') ? ' - ' : ' / ';
        const parts = title.split(separator);
        
        // Regex untuk mendeteksi aksara CJK (Jepang/Korea/Mandarin) di bagian pertama
        const hasCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/.test(parts[0]);
        
        // Kalau bagian depannya ada Kanji dan judulnya kebelah dua...
        if (hasCJK && parts.length >= 2) {
            // Buang Kanjinya, ambil sisa bahasa Inggrisnya
            title = parts.slice(1).join(separator).trim();
            console.log(`🧹 Bilingual detected! Cleaned title to: "${title}"`);
        }
    }

    // 3. Pembersih Embel-embel (Official, MV, Audio, dll)
    title = title.replace(/\s*[\(\[].*?(official|video|audio|lyric|mv|visualizer).*?[\)\]]\s*/gi, '').trim();

    return { cleanTitle: title, cleanArtist: artist };
}

// 🌟 SUPER VERIFIER: Check Title AND Artist Match!
function verifyMatch(inputTitle, inputArtist, resultTitle, resultArtist) {
    if (!inputTitle || !resultTitle) return false;
    
    const t1 = inputTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const t2 = resultTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const titleMatch = t1.includes(t2) || t2.includes(t1);

    // If the artist is empty (removed by filter), we only pass it if the title is long/specific
    // If the title is just 1-2 words like "The Call" without an artist, it's 100% prone to mismatch.
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
    // If the artist is empty after cleaning and the title is too generic (<= 10 chars), give up!
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
            // Strictly check for Title & Artist match
            const validTrack = data.data.find(t => verifyMatch(cleanTitle, cleanArtist, t.title, t.artist.name));
            
            if (validTrack) {
                return {
                    title: validTrack.title,
                    artist: validTrack.artist.name,
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

// 💉 OBAT HD UNTUK YOUTUBE FALLBACK (Force High Definition)
export function forceHDYouTubeCover(coverUrl) {
    if (!coverUrl) return coverUrl;

    // Khas YouTube Music (googleusercontent) -> Paksa parameter w1000-h1000
    if (coverUrl.includes('googleusercontent.com') && coverUrl.includes('=')) {
        return coverUrl.split('=')[0] + '=w1000-h1000-l90-rj';
    } 
    // Khas YouTube Biasa (i.ytimg) -> Paksa naik kasta ke maxresdefault
    else if (coverUrl.includes('i.ytimg.com')) {
        return coverUrl.replace(/hqdefault\.jpg|mqdefault\.jpg|sddefault\.jpg/g, 'maxresdefault.jpg');
    }
    
    return coverUrl;
}