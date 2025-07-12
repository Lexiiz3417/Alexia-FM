// src/caption.js
import { readFile } from "fs/promises";

const moodAndTags = (genre) => {
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

  const raw = await readFile("captions/default.txt", "utf-8");
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
};
