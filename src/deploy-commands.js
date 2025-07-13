// src/deploy-commands.js (Versi Go Public)
import { REST } from '@discordjs/rest';
import { Routes, ApplicationCommandOptionType } from 'discord-api-types/v10';
import dotenv from 'dotenv';
dotenv.config();

// Tambahin menu baru di sini
const commands = [
  {
    name: 'music',
    description: 'Kirim rekomendasi musik random!',
  },
  {
    name: 'setchannel',
    description: 'Atur channel ini untuk menerima postingan musik harian.',
    // Kita bikin command ini cuma bisa dipake sama admin
    default_member_permissions: '8', // '8' itu kode untuk Administrator
  },
  {
    name: 'removechannel',
    description: 'Berhenti menerima postingan musik harian di server ini.',
    default_member_permissions: '8', // Cuma admin yang boleh
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Mulai mendaftarkan slash commands (versi Go Public)...');

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log('Slash commands berhasil didaftarkan!');
  } catch (error) {
    console.error(error);
  }
})();