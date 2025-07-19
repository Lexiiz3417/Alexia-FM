// src/commands/testpost.js 

import { SlashCommandBuilder } from 'discord.js';
import { performAutopost } from '../autopost.js';

const EPHEMERAL_FLAG = 64;

export default {
  data: new SlashCommandBuilder()
    .setName('testpost')
    .setDescription('OWNER ONLY: Triggers the daily autopost function immediately.'),

  async execute(interaction) {
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({ 
        content: '⛔️ Access Denied! This command can only be used by the bot owner.', 
        flags: EPHEMERAL_FLAG // <-- Langsung pakai angkanya
      });
    }
    
    await interaction.reply({ 
      content: '🚀 Roger that, Owner! Triggering autopost sequence now...', 
      flags: EPHEMERAL_FLAG // <-- Langsung pakai angkanya
    });

    const success = await performAutopost(interaction.client);

    if (success) {
      await interaction.followUp({ 
        content: '✅ Autopost sequence completed successfully!', 
        flags: EPHEMERAL_FLAG // <-- Langsung pakai angkanya
      });
    } else {
      await interaction.followUp({ 
        content: '❌ Autopost sequence encountered an error. Check the console for details.', 
        flags: EPHEMERAL_FLAG // <-- Langsung pakai angkanya
      });
    }
  },
};