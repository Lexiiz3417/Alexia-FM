// src/whatsapp.js
import { makeWASocket, DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import pino from 'pino';
import { usePostgresAuthState } from './waAuthState.js'; 

export let waSocket = null;

export async function startWhatsAppBot() {
    const { state, saveCreds } = await usePostgresAuthState();
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }), 
        browser: Browsers.ubuntu('Chrome'), 
        syncFullHistory: false,
        getMessage: async (key) => { return { conversation: '' } } 
    });

    waSocket = sock;

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

/**
 * 🟢 FUNGSI BARU: UPDATE STATUS WA (SW)
 */
export async function sendWhatsAppPost(targetJid, text, imageBuffer) {
    if (!waSocket) return;
    try {
        const statusJid = 'status@broadcast'; // ID Rahasia buat Status
        const botJid = waSocket.user.id.split(':')[0] + '@s.whatsapp.net'; 
        
        // Penonton VIP: CEO & Bot itu sendiri (Biar lu bisa liat SW-nya)
        const viewers = [targetJid, botJid]; 

        if (imageBuffer) {
            await waSocket.sendMessage(
                statusJid, 
                { image: imageBuffer, caption: text }, 
                { statusJidList: viewers } // WAJIB ADA BIAR BISA DILIHAT!
            );
        } else {
            await waSocket.sendMessage(
                statusJid, 
                { text: text, backgroundColor: '#b8256f' }, 
                { statusJidList: viewers }
            );
        }
        console.log("🟢 ✅ Successfully posted to WhatsApp Status (SW)!");
    } catch (error) {
        console.error("❌ Failed to post to WA Status:", error);
    }
}