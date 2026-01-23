// src/ytmusic.js
import { Innertube } from 'youtubei.js';

// Shuffle array in-place (Fisher–Yates)
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
      throw new Error('YT_PLAYLIST_ID is not defined.');
    }

    console.log(`Fetching playlist: ${playlistId}...`);

    // Fetch initial batch (usually ~100 tracks)
    const playlist = await yt.getPlaylist(playlistId);

    // Collect all videos (handle pagination)
    let allVideos = [...playlist.videos];
    let currentPlaylist = playlist;

    while (currentPlaylist.has_continuation) {
      console.log(`... Fetching more tracks (${allVideos.length})`);
      currentPlaylist = await currentPlaylist.getContinuation();
      allVideos.push(...currentPlaylist.videos);
    }

    console.log(`✅ Total videos found: ${allVideos.length}`);

    const tracks = allVideos.map(item => {
      // Select highest-resolution thumbnail (fallback if missing)
      const thumbnails = item.thumbnails || [];
      const bestThumbnail =
        thumbnails.length > 0
          ? thumbnails.sort((a, b) => b.width - a.width)[0]
          : { url: '' };

      // Normalize artist name
      const artistName = item.author ? item.author.name : 'Unknown Artist';
      const cleanArtistName = artistName.replace(/ - Topic$/, '').trim();

      return {
        name: item.title.text || item.title,
        artist: cleanArtistName,
        url: `https://music.youtube.com/watch?v=${item.id}`,
        image: bestThumbnail.url,
        genre: 'Music'
      };
    });

    // Shuffle final track list
    shuffleArray(tracks);

    console.log('Playlist fetched and shuffled.');
    return tracks;

  } catch (err) {
    console.error('❌ Failed to fetch playlist:', err);
    return [];
  }
};
