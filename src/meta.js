// src/meta.js
import fetch from 'node-fetch';
import FormData from 'form-data';

const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const IG_ID = process.env.IG_BUSINESS_ID;
const THREADS_ID = process.env.THREADS_USER_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN; 
const API_VERSION = process.env.META_API_VERSION || 'v19.0';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 📦 CATBOX IMAGE HOSTING (ImgBB Alternative)
 * Bypasses strict anti-bot measures that cause the IG API to return HTML instead of the image.
 * Forces the .jpg extension to comply with Instagram's strict media type requirements.
 */
async function uploadToImageHost(imageBuffer) {
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', imageBuffer, { filename: 'alexia.jpg', contentType: 'image/jpeg' });

        const res = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: form
        });
        
        const url = await res.text();
        if (url.startsWith('http')) {
            return url.trim();
        } else {
            throw new Error(`Catbox rejected the upload: ${url}`);
        }
    } catch (error) {
        console.error("❌ [Catbox] Upload Error:", error.message);
        return null;
    }
}

/**
 * 🚀 MAIN META ECOSYSTEM DISPATCHER
 * Handles routing the post to Facebook, Instagram, and Threads based on the targetMode.
 * * @param {Buffer} imageBuffer - The rendered 2K image.
 * @param {String} caption - The main post text.
 * @param {String} engagementComment - The first comment text.
 * @param {String} targetMode - 'all', 'meta', 'ig_only', or 'fb_only'.
 */
export async function postToMeta(imageBuffer, caption, engagementComment = "", targetMode = 'all') {
    let report = { facebook: "⚪ Skipped", instagram: "⚪ Skipped", threads: "⚪ Skipped" };

    if (!ACCESS_TOKEN) {
        console.warn("⚠️ [Meta] Missing ACCESS_TOKEN.");
        return report;
    }

    // --- 1. PREPARATION: UPLOAD IMAGE TO PUBLIC HOST ---
    const publicImageUrl = await uploadToImageHost(imageBuffer);

    // --- 📘 2. FACEBOOK DISPATCH ---
    const shouldPostToFB = PAGE_ID && ['all', 'meta', 'fb_only'].includes(targetMode);
    
    if (shouldPostToFB) {
        let fbSuccess = false;
        let fbRetries = 3;

        for (let i = 0; i < fbRetries; i++) {
            try {
                const form = new FormData();
                form.append('access_token', ACCESS_TOKEN);
                form.append('message', caption);

                if (i > 0 && publicImageUrl) {
                    form.append('url', publicImageUrl); // Fallback to URL on retry
                } else {
                    form.append('source', imageBuffer, { filename: 'alexia.jpg' }); // Direct buffer upload
                }

                const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/photos`, {
                    method: 'POST',
                    body: form
                });
                const data = await res.json();

                if (data.id) {
                    report.facebook = `✅ Success ${i > 0 ? '(via URL)' : '(Direct)'}`;
                    fbSuccess = true;

                    // Post Engagement Comment
                    if (engagementComment) {
                        await fetch(`https://graph.facebook.com/${API_VERSION}/${data.id}/comments?message=${encodeURIComponent(engagementComment)}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
                    }
                    break;
                }
            } catch (error) {
                console.warn(`⚠️ [FB Retry] Attempt ${i + 1} failed.`);
                await sleep(2000 * (i + 1));
            }
        }
    }

    // If upload failed, abort IG and Threads since they strictly require a public URL
    if (!publicImageUrl) {
        if (['all', 'meta', 'ig_only'].includes(targetMode)) report.instagram = "❌ Image Host Failed";
        if (['all', 'meta'].includes(targetMode)) report.threads = "❌ Image Host Failed";
        return report;
    }

    // --- 📸 3. INSTAGRAM DISPATCH ---
    const shouldPostToIG = IG_ID && ['all', 'meta', 'ig_only'].includes(targetMode);
    
    if (shouldPostToIG) {
        let igSuccess = false;
        let igRetries = 3; 

        console.log(`🔗 [Catbox URL] ${publicImageUrl}`);

        for (let i = 0; i < igRetries; i++) {
            try {
                console.log(`📸 [Meta] Creating Instagram container (Attempt ${i + 1})...`);
                
                // 1. Create Media Container (Strictly requesting IMAGE media_type)
                const cRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${IG_ID}/media?image_url=${encodeURIComponent(publicImageUrl)}&media_type=IMAGE&caption=${encodeURIComponent(caption)}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
                const cData = await cRes.json();
                
                if (cData.id) {
                    // 2. Publish Media Container
                    const pRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${IG_ID}/media_publish?creation_id=${cData.id}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
                    const pData = await pRes.json();
                    
                    if (pData.id) {
                        report.instagram = `✅ Success ${i > 0 ? '(after retry)' : ''}`;
                        igSuccess = true;
                        
                        // 3. Post Engagement Comment
                        if (engagementComment) {
                            try {
                                await fetch(`https://graph.facebook.com/${API_VERSION}/${pData.id}/comments?message=${encodeURIComponent(engagementComment)}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
                                console.log("💬 [IG] First comment posted successfully!");
                            } catch (commentErr) {
                                console.warn("⚠️ [IG] Failed to post first comment.");
                            }
                        }
                        break; // Exit retry loop on success
                    } else {
                        report.instagram = "❌ Publish Failed";
                    }
                } else {
                    report.instagram = `❌ Container Error: ${cData.error?.message || 'Unknown Error'}`;
                }
            } catch (error) { 
                report.instagram = `❌ API Error: ${error.message}`; 
            }

            if (!igSuccess && i < igRetries - 1) {
                console.warn(`⚠️ [IG Retry] Meta server fetching delay. Retrying in ${(i + 1) * 3} seconds...`);
                await sleep(3000 * (i + 1));
            }
        }
    }

    // --- 🧵 4. THREADS DISPATCH ---
    const shouldPostToThreads = THREADS_ID && ['all', 'meta'].includes(targetMode);
    
    if (shouldPostToThreads) {
        try {
            // 1. Create Threads Container
            const tRes = await fetch(`https://graph.threads.net/v1.0/${THREADS_ID}/threads?media_type=IMAGE&image_url=${encodeURIComponent(publicImageUrl)}&text=${encodeURIComponent(caption)}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
            const tData = await tRes.json();
            
            if (tData.id) {
                // 2. Publish Threads Container
                const tpRes = await fetch(`https://graph.threads.net/v1.0/${THREADS_ID}/threads_publish?creation_id=${tData.id}&access_token=${ACCESS_TOKEN}`, { method: 'POST' });
                const tpData = await tpRes.json();
                report.threads = tpData.id ? "✅ Success" : "❌ Publish Failed";
            }
        } catch (error) { 
            report.threads = `❌ API Error: ${error.message}`; 
        }
    }

    return report;
}