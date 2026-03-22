// src/whatsapp.js
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';

export let waSocket = null;

export async function startWhatsAppBot() {
    const authPath = path.resolve(process.cwd(), 'data', 'auth_wa');
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        // 🌟 WAJIB: Pake browser Chrome biar Pairing Code muncul
        browser: Browsers.ubuntu('Chrome'), 
    });

    waSocket = sock;

    // --- 🔑 LOGIKA PAIRING CODE ---
    // Cek kalo belum login, kita minta kode
    if (!sock.authState.creds.registered) {
        const phoneNumber = "6285163133417"; // Nomor lu (Tanpa + atau spasi)
        
        // Kasih jeda 5 detik biar koneksi socket stabil dulu
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n🔑 [WHATSAPP PAIRING CODE]: ${code.match(/.{1,4}/g).join('-')}\n`);
                console.log(`👉 Buka WA di HP -> Linked Devices -> Link with phone number instead`);
                console.log(`👉 Masukkan kode di atas ya CEO!\n`);
            } catch (err) {
                console.error("❌ Gagal generate pairing code:", err.message);
            }
        }, 5000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) setTimeout(() => startWhatsAppBot(), 5000);
        } else if (connection === 'open') {
            console.log('✅ BOOM! ALEXIA WA BERHASIL CONNECT VIA PAIRING CODE!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

export async function sendWhatsAppPost(targetJid, text, imageBuffer) {
    if (!waSocket) return;
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