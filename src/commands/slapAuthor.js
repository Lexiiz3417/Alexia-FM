// src/commands/slapAuthor.js

import { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { getActionGif } from '../imageAPI.js';

export default {
  // DATA: Nama command ini yang akan muncul di menu klik kanan
  data: new ContextMenuCommandBuilder()
    .setName('Slap This Author') // <-- Nama dalam Bahasa Inggris
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    // Balasan awal kita sembunyikan agar tidak mengganggu channel
    await interaction.deferReply({ ephemeral: true });

    const authorOfCommand = interaction.user;
    const targetMessage = interaction.targetMessage;
    const targetAuthor = targetMessage.author;
    
    const gifUrl = await getActionGif('slap');

    if (!gifUrl) {
      return interaction.editReply({ content: "Oops! Couldn't get a slap GIF right now. Please try again." });
    }

    let description = '';
    if (targetAuthor.id === authorOfCommand.id) {
      description = `${authorOfCommand} tries to slap themselves via a message... That's just weird.`;
    } else {
      description = `**Ouch! ${authorOfCommand} just slapped ${targetAuthor}!**`;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#F1C40F') // Warna kuning untuk slap
      .setDescription(description)
      .setImage(gifUrl)
      .setFooter({ text: 'Powered by waifu.pics' });

    // Mengirim pesan balasan ke channel, dengan mereferensikan pesan target
    await interaction.channel.send({
        // Kita bisa tambahkan kutipan kecil dari pesan aslinya untuk konteks
        content: `In response to "${targetMessage.content.substring(0, 50)}..."`,
        embeds: [embed],
        reply: {
            messageReference: targetMessage.id,
            failIfNotExists: false // Jangan error jika pesan aslinya sudah dihapus
        }
    });

    // Konfirmasi tersembunyi ke user bahwa aksinya berhasil
    await interaction.editReply({ content: 'Slap has been delivered!' });
  },
};