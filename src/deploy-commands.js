// src/deploy-commands.js
import { REST } from '@discordjs/rest';
import { Routes, ApplicationCommandOptionType } from 'discord-api-types/v10';
import dotenv from 'dotenv';
dotenv.config();

const commands = [
  {
    name: 'music',
    description: 'Kirim rekomendasi musik random!',
  },
  {
    name: 'setchannel',
    description: 'Atur sebuah channel untuk menerima postingan musik harian.',
    default_member_permissions: '8', // <-- Admin Only
    options: [
      {
        name: 'channel',
        description: 'Pilih channel yang akan menerima postingan.',
        type: ApplicationCommandOptionType.Channel,
        required: true,
      },
    ],
  },
  {
    name: 'removechannel',
    description: 'Berhenti menerima postingan musik harian di server ini.',
    default_member_permissions: '8', 
  },
  {
    name: 'subscribers',
    description: 'Cek berapa banyak server yang sudah subscribe Alexia FM!',
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Mendaftarkan slash commands (versi Statistik Publik)...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );
    console.log('Slash commands berhasil didaftarkan!');
  } catch (error) {
    console.error(error);
  }
})();