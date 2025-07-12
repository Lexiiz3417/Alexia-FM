// src/spotify.js
import fetch from "node-fetch";

const getAccessToken = async () => {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
        ).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  return data.access_token;
};

export const getRandomTrack = async () => {
  const accessToken = await getAccessToken();

  const playlistId = process.env.SPOTIFY_PLAYLIST_ID;
  const playlistUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
  const res = await fetch(playlistUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();

  const tracks = data.items.map((item) => item.track).filter(Boolean);
  const chosen = tracks[Math.floor(Math.random() * tracks.length)];

  const artistId = chosen.artists[0].id;
  const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const artistData = await artistRes.json();

  return {
    name: chosen.name,
    artist: chosen.artists[0].name,
    url: chosen.external_urls.spotify,
    image: chosen.album.images[0].url,
    genre: artistData.genres[0] || "Music",
  };
};
