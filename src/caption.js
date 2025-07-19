// src/caption.js 

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';

export const moodAndTags = (genre) => {
  const g = genre.toLowerCase();
  if (g.includes("lo-fi") || g.includes("chill")) return ["🌙 Chill vibes detected!", "#LoFi #ChillBeats"];
  if (g.includes("rock") || g.includes("punk")) return ["⚡ Rock the day!", "#RockOn #AltRock"];
  if (g.includes("pop")) return ["🎤 Catchy pop anthem!", "#PopHits"];
  if (g.includes("r&b") || g.includes("soul")) return ["💜 Smooth and soulful", "#RnB #SoulMusic"];
  if (g.includes("hip hop") || g.includes("rap")) return ["🔥 Drop the beat!", "#HipHop #RapDaily"];
  if (g.includes("electronic") || g.includes("edm") || g.includes("bass")) return ["🎧 Electronic energy boost!", "#EDM #Electro"];
  if (g.includes("sad") || g.includes("acoustic") || g.includes("piano")) return ["🌧️ Soft, emotional tune", "#SadSongs #AcousticVibes"];
  return ["🎶 Your song of the day!", "#Vibes"];
};

export const generateCaption = async ({ day, title, artist, genre, link }) => {
  const [mood, tags] = moodAndTags(genre);
  const tagUmum = "#MusicDiscovery #SongOfTheDay #NowPlaying";

  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    // Path relativenya kita perbaiki biar lebih solid
    const templatePath = path.join(__dirname, '..', 'captions', 'default.txt');
    const raw = await readFile(templatePath, "utf-8");
    
    const templates = raw.split(/---+/).map((t) => t.trim()).filter(Boolean);
    const chosen = templates[Math.floor(Math.random() * templates.length)];

    return chosen
      .replace(/{day}/g, day)
      .replace(/{title}/g, title)
      .replace(/{artist}/g, artist)
      .replace(/{genre}/g, genre)
      .replace(/{link}/g, link)
      .replace(/{mood}/g, mood)
      .replace(/{tags}/g, `${tags} ${tagUmum}`);
  } catch (error) {
    console.error("❌ Failed to read caption file, using fallback template:", error);
    // Template darurat jika file tidak ditemukan
    return `${mood}\nDay ${day} – Music Pick 🎧\n🎵 ${title}\n🎤 ${artist}\n🎼 Genre: ${genre}\nListen Now:\n${link}\n${tags} ${tagUmum}`;
  }
};