// src/caption.js (VERSI BARU - ANTI GAGAL ENCODING)

// Kita tidak lagi butuh 'readFile'
// import { readFile } from "fs/promises";

// Fungsi ini tetap sama, tidak ada perubahan
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

// =================================================================
// PERUBAHAN UTAMA DI SINI
// =================================================================
// Template dari default.txt kita masukkan langsung ke dalam kode
const rawTemplate = `/ᐠ - ˕ -マ ⛧°. ⋆༺☾༻⋆. °⛧
╭∪─∪────────── 𝄞⨾𓍢ִ໋,♫,♪
┊ {mood}
┊ Day {day} – Music Pick 🎧
┊
┊   🎵 {title}
┊   🎤 {artist}
┊   🎼 Genre: {genre}
┊
┊ Listen Now:
┊ {link}
╰─────────────  𝄞⨾𓍢ִ໋,♫,♪

{tags}
---
⊹ ࣪ ﹏𓊝﹏𓂁﹏⊹ ࣪ ˖
╭───────── 𝄞⨾𓍢ִ໋,♫,♪
┊ {mood}
┊ Day {day} – Music Pick 🎧
┊
┊   🎵 {title}
┊   🎤 {artist}
┊   🎼 Genre: {genre}
┊
┊ Listen Now:
┊ {link} 
╰─────────  𝄞⨾𓍢ִ໋,♫,♪

{tags}`;
// =================================================================

/**
 * Fungsi utama untuk membuat caption estetik dari template.
 */
export const generateCaption = async ({ day, title, artist, genre, link }) => {
  const [mood, tags] = moodAndTags(genre);
  const tagUmum = "#MusicDiscovery #SongOfTheDay #NowPlaying";

  // Kita tidak lagi membaca file, tapi langsung menggunakan template di atas
  const templates = rawTemplate.split(/---+/).map((t) => t.trim()).filter(Boolean);
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