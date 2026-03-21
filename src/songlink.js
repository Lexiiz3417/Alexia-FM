// src/songlink.js
import fetch from "node-fetch";

export const getOdesliData = async (musicUrl) => {
  try {
    const apiUrl = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(musicUrl)}&userCountry=ID`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
        throw new Error(`Odesli API returned status: ${response.status}`);
    }
    
    const data = await response.json();
    let bestEntity = null;

    // Prioritas 1: Apple Music
    const appleMusicLink = data.linksByPlatform.appleMusic;
    if (appleMusicLink) {
        bestEntity = data.entitiesByUniqueId[appleMusicLink.entityUniqueId];
    }

    // Prioritas 2: Spotify
    if (!bestEntity) {
        const spotifyLink = data.linksByPlatform.spotify;
        if (spotifyLink) {
            bestEntity = data.entitiesByUniqueId[spotifyLink.entityUniqueId];
        }
    }

    // Prioritas 3: Fallback ke data default
    if (!bestEntity) {
        bestEntity = data.entitiesByUniqueId[data.entityUniqueId];
    }

    if (!bestEntity) {
      throw new Error("No entity found in Odesli"); // Lempar ke catch biar di-handle Scraper
    }

    const cleanArtistName = bestEntity.artistName
        .replace(/(\s*-\s*Topic|\s*Official\s*Channel|\s*VEVO|\s?Official)$/i, '')
        .trim();

    return {
      pageUrl: data.pageUrl,
      title: bestEntity.title,
      artist: cleanArtistName,
      imageUrl: bestEntity.thumbnailUrl,
    };

  } catch (err) {
    console.error(`⚠️ Odesli Limit/Error (${err.message}). Mengaktifkan Scraper Darurat... 🕵️‍♂️`);
    
    // --- 🚨 JURUS SCRAPER DARURAT (ANTI 429) ---
    try {
        const htmlRes = await fetch(musicUrl);
        const htmlText = await htmlRes.text();
        
        const titleMatch = htmlText.match(/<title>(.*?)<\/title>/i);
        if (!titleMatch) return null;
        
        let rawTitle = titleMatch[1];
        let artist = "Unknown Artist";
        let title = rawTitle;

        // Parsing Spotify Web ("Judul - song and lyrics by Artis | Spotify")
        if (rawTitle.includes(' - song and lyrics by ')) {
            const parts = rawTitle.replace(' | Spotify', '').split(' - song and lyrics by ');
            title = parts[0];
            artist = parts[1] || artist;
        } 
        // Parsing YouTube Web
        else if (rawTitle.includes(' - YouTube')) {
            title = rawTitle.replace(' - YouTube', '');
        }
        // Parsing Apple Music Web
        else if (rawTitle.includes(' by ')) {
             const parts = rawTitle.replace(' on Apple Music', '').split(' by ');
             title = parts[0];
             artist = parts[1] || artist;
        }

        console.log(`✅ Scraper berhasil mencuri data: ${title} - ${artist}`);
        return {
            title: title.trim(),
            artist: artist.trim(),
            imageUrl: null, // Kosongin biar coverFinder yang cari HD-nya
            pageUrl: musicUrl 
        };
    } catch (scrapeErr) {
        console.error("❌ Scraper Darurat juga gagal:", scrapeErr.message);
        return null;
    }
  }
};