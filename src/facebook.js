// src/facebook.js

import fetch from 'node-fetch';
import FormData from 'form-data';

// Ambil Env Vars di awal biar rapi
const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

/**
 * Helper: Tidur sebentar (Delay)
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper: Fetch dengan Retry Mechanism
 * Mencegah error ETIMEDOUT dengan mencoba ulang sampai 3x
 */
async function fetchWithRetry(url, options, retries = 3, backoff = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            // Kalau server FB lagi down (5xx) atau error lain, throw error biar di-retry
            if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            return response;
        } catch (err) {
            console.warn(`⚠️ [FB Retry] Attempt ${i + 1} failed. Retrying in ${backoff/1000}s... Reason: ${err.message}`);
            if (i === retries - 1) throw err; // Menyerah setelah 3x percobaan
            await sleep(backoff);
            backoff *= 2; // Tunggu makin lama (2s, 4s, 8s...)
        }
    }
}

/**
 * Memposting gambar ke Facebook dengan fitur Retry & Support Buffer/URL
 */
export async function postToFacebook(imageSource, caption) {
    if (!PAGE_ID || !ACCESS_TOKEN) {
        console.warn("⚠️ Facebook Config missing. Skipping FB post.");
        return null;
    }

    const url = `https://graph.facebook.com/v18.0/${PAGE_ID}/photos`;

    try {
        const formData = new FormData();
        formData.append('access_token', ACCESS_TOKEN);
        formData.append('message', caption);
        formData.append('published', 'true');

        if (Buffer.isBuffer(imageSource)) {
            // Upload File (Buffer)
            formData.append('source', imageSource, { filename: 'image.png', contentType: 'image/png' });
            console.log("🚀 Uploading image buffer to Facebook (with retry)...");
        } else {
            // Upload URL
            formData.append('url', imageSource);
            console.log("🚀 Sending image URL to Facebook (with retry)...");
        }

        // --- ACTION: PAKE RETRY ---
        const response = await fetchWithRetry(url, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.error) {
            console.error("❌ FB API Rejected:", data.error);
            return null;
        }

        // API Facebook mengembalikan 'id' (format: PAGEID_POSTID)
         if (data.id) {
            console.log(`✅ Successfully posted to Facebook! ID: ${data.id}`);
            return data.id; 
        }

        return null;

    } catch (error) {
        console.error("❌ Final Error posting to Facebook:", error.message);
        return null;
    }
}

/**
 * Comment dengan Retry
 */
export async function commentOnPost(postId, message) {
    if (!ACCESS_TOKEN || !postId) return;

    const url = `https://graph.facebook.com/v18.0/${postId}/comments`;

    try {
        // Kita pakai JSON Body seperti kode awalmu (lebih rapi untuk teks panjang)
        const bodyData = {
            message: message,
            access_token: ACCESS_TOKEN
        };

        await fetchWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        console.log("💬 Successfully commented on FB post!");

    } catch (error) {
        console.error("❌ Failed to comment on FB post:", error.message);
    }
}