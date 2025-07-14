import { SlashCommandBuilder } from 'discord.js';
import Keyv from 'keyv';

const db = new Keyv('sqlite://db.sqlite');

// Membungkus semuanya dalam satu 'export default'
export default {
  data: new SlashCommandBuilder()
    .setName('removechannel')
    .setDescription('Stop receiving daily music posts on this server.')
    .setDefaultMemberPermissions('8'),

  async execute(interaction) {
    // Di dalam command handler, kita tidak perlu cek permission lagi, karena sudah di-set di 'data'
    const serverId = interaction.guildId;
    const existingChannel = await db.get(serverId);

    if (!existingChannel) {
      return interaction.reply({
        content: 'This server isn\'t set up to receive daily posts yet.',
        ephemeral: true
      });
    }

    await db.delete(serverId);
    
    await interaction.reply({
      content: 'Got it! This server will no longer receive daily music posts.',
      ephemeral: true
    });
    console.log(`🗑️ Channel removed for server ${serverId}`);
  }
};