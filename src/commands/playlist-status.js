// src/commands/playlist-status.js

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Keyv from 'keyv';

const db = new Keyv('sqlite://data/db.sqlite');

export default {
  data: new SlashCommandBuilder()
    .setName('playlist-status')
    .setDescription('OWNER ONLY: Checks the current status of the shuffled playlist.'),

  async execute(interaction) {
    // Pastikan hanya owner yang bisa pakai
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ 
        content: '⛔️ Access Denied! This command is for the bot owner only.', 
        ephemeral: true 
      });
    }
    
    await interaction.deferReply({ ephemeral: true });

    const shuffledPlaylist = await db.get('shuffled_playlist');
    const currentIndex = await db.get('playlist_index') || 0;

    if (!shuffledPlaylist || shuffledPlaylist.length === 0) {
      return interaction.editReply({ content: 'Cache playlist di database saat ini kosong. Akan dibuat saat autopost berikutnya.' });
    }

    const totalSongs = shuffledPlaylist.length;
    const lastPostedTrack = currentIndex > 0 ? shuffledPlaylist[currentIndex - 1] : { name: 'Belum ada' };
    
    let nextTracksList = '';
    for (let i = 0; i < 5; i++) {
      if (currentIndex + i < totalSongs) {
        const track = shuffledPlaylist[currentIndex + i];
        nextTracksList += `**${currentIndex + i + 1}.** ${track.name} - *${track.artist}*\n`;
      } else {
        break;
      }
    }
    if (nextTracksList === '') {
        nextTracksList = 'Akhir dari playlist. Akan diacak ulang pada post berikutnya.';
    }

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('📊 Dashboard Status Playlist')
      .addFields(
        { name: 'Total Lagu di Cache', value: `**${totalSongs}** lagu`, inline: true },
        { name: 'Indeks Lagu Berikutnya', value: `**${currentIndex + 1}** / ${totalSongs}`, inline: true },
        { name: 'Lagu Terakhir Diposting', value: `*${lastPostedTrack.name}*` },
        { name: 'Antrian Lagu (5 Berikutnya)', value: nextTracksList }
      )
      .setFooter({ text: 'Data ini dibaca langsung dari db.sqlite' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};