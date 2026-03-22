// src/whatsapp.js

import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';
import qrcode from 'qrcode-terminal';

// 🌟 INI PINTU KELUARNYA BIAR FILE LAIN BISA NGE-POST KE WA
export let waSocket = null;

export async function startWhatsAppBot() {
    console.log("🟢 Menyiapkan mesin Alexia WhatsApp...");

    const authPath = path.resolve(process.cwd(), 'data', 'auth_wa');
    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    // Gak usah nge-print versi lagi biar terminal lu bersih
    // console.log(`📡 Pake WA Web versi: ${version.join('.')} (Terbaru: ${isLatest})`);

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }), // 🌟 Kembalikan ke silent biar terminal lu estetik lagi!
        browser: ['Alexia WA', 'Chrome', '1.0.0']
    });

    // 🌟 SIMPAN MESINNYA KE VARIABLE GLOBAL
    waSocket = sock;

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n📱 CEPAT SCAN QR CODE INI PAKE WA LU CEO!\n');
            qrcode.generate(qr, { small: true }); 
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                setTimeout(() => { startWhatsAppBot(); }, 5000);
            } else {
                console.log('❌ WA Logout. Hapus folder data/auth_wa dan scan ulang.');
            }
        } else if (connection === 'open') {
            console.log('✅ BOOM! ALEXIA WA BERHASIL CONNECT KE NOMOR LU!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

// 🌟 FUNGSI BUAT AUTOPOST KE WA (Bisa dipanggil dari autopost.js lu!)
export async function sendWhatsAppPost(targetJid, text, imageBuffer) {
    if (!waSocket) {
        console.log("⚠️ WA belum connect, skip posting WA.");
        return;
    }
    try {
        if (imageBuffer) {
            await waSocket.sendMessage(targetJid, { image: imageBuffer, caption: text });
        } else {
            await waSocket.sendMessage(targetJid, { text: text });
        }
        console.log("✅ Berhasil nge-post ke WhatsApp!");
    } catch (error) {
        console.error("❌ Gagal nge-post ke WA:", error);
    }
}