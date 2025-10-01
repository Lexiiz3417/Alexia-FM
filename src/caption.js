// src/caption.js

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

export const moodAndTags = () => {
  return ["🎶 Your song of the day!", "#Vibes"];
};

export const generateCaption = async ({ day, title, artist, link }) => {
  const [mood, tags] = moodAndTags();
  const tagUmum = "#MusicDiscovery #SongOfTheDay #NowPlaying";

  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const templatePath = path.join(__dirname, '..', 'captions', 'default.txt');
    const raw = await readFile(templatePath, "utf-8");
    
    const templates = raw.split(/---+/).map((t) => t.trim()).filter(Boolean);
    const chosen = templates[Math.floor(Math.random() * templates.length)];

    return chosen
      .replace(/{day}/g, day)
      .replace(/{title}/g, title)
      .replace(/{artist}/g, artist)
      .replace(/{link}/g, link)
      .replace(/{mood}/g, mood) // Akan selalu pakai '🎶 Your song of the day!'
      .replace(/{tags}/g, `${tags} ${tagUmum}`);
  } catch (error) {
    console.error("❌ Failed to read caption file, using fallback template:", error);
    // Fallback template juga disederhanakan
    return `${mood}\nDay ${day} – Music Pick 🎧\n🎵 ${title}\n🎤 ${artist}\nListen Now:\n${link}\n${tags} ${tagUmum}`;
  }
};