// src/commands/testpost.js

import { SlashCommandBuilder } from 'discord.js';
import { performAutopost } from '../autopost.js';

export default {
  // Kita hapus setDefaultMemberPermissions karena kita akan cek Owner ID secara manual
  // Ini membuat keamanannya tidak lagi bergantung pada peran di server
  data: new SlashCommandBuilder()
    .setName('testpost')
    .setDescription('OWNER ONLY: Triggers the daily autopost function immediately.'),

  async execute(interaction) {
    // =============================================================
    // SISTEM KEAMANAN BARU: CEK OWNER ID
    // =============================================================
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ 
        content: '⛔️ Access Denied! This command can only be used by the bot owner.', 
        ephemeral: true 
      });
    }
    // =============================================================

    await interaction.reply({ content: '🚀 Roger that, Owner! Triggering autopost sequence now...', ephemeral: true });

    const success = await performAutopost(interaction.client);

    if (success) {
      await interaction.followUp({ content: '✅ Autopost sequence completed successfully!', ephemeral: true });
    } else {
      await interaction.followUp({ content: '❌ Autopost sequence encountered an error. Check the console for details.', ephemeral: true });
    }
  },
};