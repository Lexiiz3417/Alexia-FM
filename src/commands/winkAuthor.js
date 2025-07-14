// src/commands/winkAuthor.js

import { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { getActionGif } from '../imageAPI.js';

export default {
  data: new ContextMenuCommandBuilder()
    .setName('Wink At This Author')
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const authorOfCommand = interaction.user;
    const targetMessage = interaction.targetMessage;
    const targetAuthor = targetMessage.author;
    
    const gifUrl = await getActionGif('wink'); 

    if (!gifUrl) {
      return interaction.editReply({ content: "Oops! The winking mechanism is jammed." });
    }

    const description = `**${authorOfCommand} winks at ${targetAuthor}.** 😉`;
    
    const embed = new EmbedBuilder()
      .setColor('#9B59B6') // Warna ungu genit
      .setDescription(description)
      .setImage(gifUrl)
      .setFooter({ text: 'Powered by waifu.pics' });

    await interaction.channel.send({
        content: `In response to "${targetMessage.content.substring(0, 50)}..."`,
        embeds: [embed],
        reply: {
            messageReference: targetMessage.id,
            failIfNotExists: false
        }
    });

    await interaction.editReply({ content: 'Wink has been delivered!' });
  },
};