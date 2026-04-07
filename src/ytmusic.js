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

    // 🌟 UPGRADE: Use YT Music endpoint instead of standard YT
    const playlist = await yt.music.getPlaylist(playlistId);

    // In YT Music API, track lists are typically in .items (fallback to .videos)
    let allVideos = playlist.items || playlist.videos || [];
    let currentPlaylist = playlist;

    while (currentPlaylist.has_continuation) {
      console.log(`... Fetching more tracks (${allVideos.length})`);
      currentPlaylist = await currentPlaylist.getContinuation();
      const moreVideos = currentPlaylist.items || currentPlaylist.videos || [];
      allVideos.push(...moreVideos);
    }

    console.log(`✅ Total videos found: ${allVideos.length}`);

    const tracks = allVideos.map(item => {
      const thumbnails = item.thumbnails || [];
      const bestThumbnail =
        thumbnails.length > 0
          ? thumbnails.sort((a, b) => b.width - a.width)[0]
          : { url: '' };

      // 🌟 CAPTURE ALL COLLABORATING ARTISTS
      let artistName = 'Unknown Artist';
      
      if (item.artists && Array.isArray(item.artists) && item.artists.length > 0) {
          // Map all artist names and join them with commas
          artistName = item.artists.map(a => a.name).join(', ');
      } else if (item.authors && Array.isArray(item.authors) && item.authors.length > 0) {
          // Alternative API format
          artistName = item.authors.map(a => a.name).join(', ');
      } else if (item.author) {
          // Emergency fallback to Channel name
          artistName = item.author.name || item.author;
      }

      const cleanArtistName = artistName.replace(/ - Topic$/, '').trim();
      const rawTitle = item.title?.text || item.title || 'Unknown Title';

      return {
        name: rawTitle,
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