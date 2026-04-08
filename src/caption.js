// src/caption.js

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

/**
 * Generates a random caption from a template file and injects track data.
 * @param {object} data - { day, title, artist, full_artist, link }
 */
export const generateCaption = async ({ day, title, artist, full_artist, link }) => {
  
  // --- HASHTAG CONFIGURATION ---
  // General hashtags to boost discovery
  const tags = "#MusicDiscovery #SongOfTheDay #NowPlaying #DailyVibes";

  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const templatePath = path.join(__dirname, '..', 'captions', 'default.txt');
    
    // Read the raw template file
    const raw = await readFile(templatePath, "utf-8");
    
    // Split templates by '---' separator and filter out empty strings
    const templates = raw.split(/---+/).map((t) => t.trim()).filter(Boolean);
    
    // Pick a random template from the list
    const chosen = templates[Math.floor(Math.random() * templates.length)];

    /**
     * Replacement Logic:
     * {artist}      -> Main artist only (clean for narration)
     * {full_artist} -> Full artist list from YouTube (perfect for footer credit)
     */
    return chosen
      .replace(/{day}/g, day)
      .replace(/{title}/g, title)
      .replace(/{artist}/g, artist)
      .replace(/{full_artist}/g, full_artist || artist) // Fallback to artist if full_artist is null
      .replace(/{link}/g, link)
      .replace(/{tags}/g, tags); 

  } catch (error) {
    console.error("❌ [Caption] Failed to read template file. Using emergency fallback:", error.message);
    
    // Fallback template in case of file error
    return `DAY #${day}\n🎵 ${title} – ${artist}\n🔗 Stream: ${link}\n\n${tags}`;
  }
};