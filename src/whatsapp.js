// src/whatsapp.js
import { makeWASocket, DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import pino from 'pino';
import { usePostgresAuthState } from './waAuthState.js'; // ☁️ Import Cloud Auth Adaptor

export let waSocket = null;

export async function startWhatsAppBot() {
    // --- ☁️ USE CLOUD AUTH STATE ---
    const { state, saveCreds } = await usePostgresAuthState();
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }), // Silence Baileys logs completely
        browser: Browsers.ubuntu('Chrome'), 
        // 🌟 RAM OPTIMIZATION: Ignore old chat history on login
        syncFullHistory: false,
        // 🌟 RAM OPTIMIZATION: Do not cache incoming messages in memory
        getMessage: async (key) => { return { conversation: '' } } 
    });

    waSocket = sock;

    // --- 🔑 PAIRING CODE LOGIC ---
    if (!sock.authState.creds.registered) {
        const phoneNumber = "6285163133417"; 
        
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n🔑 [WHATSAPP PAIRING CODE]: ${code.match(/.{1,4}/g).join('-')}\n`);
                console.log(`👉 Open WA on Phone -> Linked Devices -> Link with phone number instead`);
                console.log(`👉 Enter the code above, CEO!\n`);
            } catch (err) {
                console.error("❌ Failed to generate pairing code:", err.message);
            }
        }, 5000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) setTimeout(() => startWhatsAppBot(), 5000);
        } else if (connection === 'open') {
            console.log('✅ BOOM! ALEXIA WA SUCCESSFULLY CONNECTED VIA CLOUD AUTH!');
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
        console.log("✅ Successfully posted to WhatsApp!");
    } catch (error) {
        console.error("❌ Failed to post to WA:", error);
    }
}