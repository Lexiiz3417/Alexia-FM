// src/meta.js
import fetch from 'node-fetch';
import FormData from 'form-data';

const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const IG_ID = process.env.IG_BUSINESS_ID;
const THREADS_ID = process.env.THREADS_USER_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN; 
const API_VERSION = process.env.META_API_VERSION || 'v19.0';
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function uploadToImgBB(imageBuffer) {
    if (!IMGBB_API_KEY) return null;
    try {
        const base64Image = imageBuffer.toString('base64');
        const body = new URLSearchParams();
        body.append('image', base64Image);

        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: body
        });
        const data = await res.json();
        return data.success ? data.data.url : null;
    } catch (e) {
        console.error("❌ [ImgBB] Upload Error:", e.message);
        return null;
    }
}

export async function postToMeta(imageBuffer, caption, engagementComment = "", targetMode = 'all') {
    let report = { facebook: "⚪ Skipped", instagram: "⚪ Skipped", threads: "⚪ Skipped" };
    if (!ACCESS_TOKEN) return report;

    const publicImageUrl = await uploadToImgBB(imageBuffer);

    // --- 📘 2. FACEBOOK SECTION (Run if 'all', 'meta', or 'fb_only') ---
    if (PAGE_ID && (targetMode === 'all' || targetMode === 'meta' || targetMode === 'fb_only')) {
        let fbSuccess = false;
        let fbRetries = 3;
        for (let i = 0; i < fbRetries; i++) {
            try {
                const form = new FormData();
                form.append('access_token', ACCESS_TOKEN);
                form.append('message', caption);

                if (i > 0 && publicImageUrl) {
                    form.append('url', publicImageUrl);
                } else {
                    form.append('source', imageBuffer, { filename: 'alexia.png' });
                }

                const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/photos`, {
                    method: 'POST',
                    body: form
                });
                const data = await res.json();

                if (data.id) {
                    report.facebook = `✅ Success ${i > 0 ? '(via ImgBB)' : '(Direct)'}`;
                    fbSuccess = true;
                    if (engagementComment) {
                        await fetch(`https://graph.facebook.com/${API_VERSION}/${data.id}/comments?message=${encodeURIComponent(engagementComment)}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
                    }
                    break;
                }
            } catch (e) {
                console.warn(`⚠️ [FB Retry] Attempt ${i + 1} failed`);
                await sleep(2000 * (i + 1));
            }
        }
    }

    if (!publicImageUrl) {
        if (targetMode === 'all' || targetMode === 'meta' || targetMode === 'ig_only') report.instagram = "❌ ImgBB Failed";
        if (targetMode === 'all' || targetMode === 'meta') report.threads = "❌ ImgBB Failed";
        return report;
    }

    // --- 📸 3. INSTAGRAM SECTION (Run if 'all', 'meta', or 'ig_only') ---
    if (IG_ID && (targetMode === 'all' || targetMode === 'meta' || targetMode === 'ig_only')) {
        let igSuccess = false;
        let igRetries = 3; 

        console.log(`🔗 [ImgBB URL] ${publicImageUrl}`);

        for (let i = 0; i < igRetries; i++) {
            try {
                console.log(`📸 [Meta] Creating Instagram container (Attempt ${i + 1})...`);
                
                const cRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${IG_ID}/media?image_url=${encodeURIComponent(publicImageUrl)}&media_type=IMAGE&caption=${encodeURIComponent(caption)}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
                const cData = await cRes.json();
                
                if (cData.id) {
                    const pRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${IG_ID}/media_publish?creation_id=${cData.id}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
                    const pData = await pRes.json();
                    
                    if (pData.id) {
                        report.instagram = `✅ Success ${i > 0 ? '(after retry)' : ''}`;
                        igSuccess = true;
                        
                        if (engagementComment) {
                            try {
                                await fetch(`https://graph.facebook.com/${API_VERSION}/${pData.id}/comments?message=${encodeURIComponent(engagementComment)}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
                                console.log("💬 First comment posted on Instagram!");
                            } catch (commentErr) {}
                        }
                        break; 
                    } else {
                        report.instagram = "❌ Publish Failed";
                    }
                } else {
                    report.instagram = `❌ Container Error: ${cData.error?.message || 'Unknown'}`;
                }
            } catch (e) { 
                report.instagram = `❌ Error: ${e.message}`; 
            }

            if (!igSuccess && i < igRetries - 1) {
                console.warn(`⚠️ [IG Retry] Meta server not ready. Waiting ${(i + 1) * 3} seconds...`);
                await sleep(3000 * (i + 1));
            }
        }
    }

    // --- 🧵 4. THREADS SECTION (Run if 'all' or 'meta') ---
    if (THREADS_ID && (targetMode === 'all' || targetMode === 'meta')) {
        try {
            const tRes = await fetch(`https://graph.threads.net/v1.0/${THREADS_ID}/threads?media_type=IMAGE&image_url=${encodeURIComponent(publicImageUrl)}&text=${encodeURIComponent(caption)}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
            const tData = await tRes.json();
            if (tData.id) {
                const tpRes = await fetch(`https://graph.threads.net/v1.0/${THREADS_ID}/threads_publish?creation_id=${tData.id}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
                const tpData = await tpRes.json();
                report.threads = tpData.id ? "✅ Success" : "❌ Publish Failed";
            }
        } catch (e) { report.threads = `❌ Error: ${e.message}`; }
    }

    return report;
}