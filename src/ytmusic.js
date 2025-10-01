// src/ytmusic.js
import { Innertube } from 'youtubei.js';

// Fungsi untuk mengacak array, ini 'kuncian' biar lagunya gak monoton
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export const getPlaylistTracks = async () => {
  try {
    const yt = await Innertube.create();
    const playlistId = process.env.YT_PLAYLIST_ID;

    if (!playlistId) {
      throw new Error("YT_PLAYLIST_ID is not defined in environment variables.");
    }

    console.log(`Fetching playlist: ${playlistId}...`);
    const playlist = await yt.getPlaylist(playlistId);
    console.log(`Found ${playlist.videos.length} videos in the playlist.`);

    const tracks = playlist.videos.map(item => {
      // Kita ambil thumbnail kualitas terbaik
      const bestThumbnail = item.thumbnails.sort((a, b) => b.width - a.width)[0];
      const cleanArtistName = item.author.name.replace(/ - Topic$/, '').trim();
      return {
        name: item.title.text,
        artist: item.author.name,
        url: `https://music.youtube.com/watch?v=${item.id}`,
        image: bestThumbnail.url,
        genre: 'Music' // Kita set default dulu, karena YT Music API gak provide genre semudah Spotify
      };
    });

    // Langsung kita acak di sini!
    shuffleArray(tracks);
    console.log("Playlist has been successfully fetched and shuffled.");
    return tracks;

  } catch (err) {
    console.error("❌ Failed to fetch or process YouTube Music playlist:", err);
    return []; // Kembalikan array kosong jika gagal
  }
};