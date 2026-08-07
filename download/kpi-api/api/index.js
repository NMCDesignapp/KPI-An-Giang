const fs = require('fs');
const path = require('path');

const ROOT_INDEX = 'https://raw.githubusercontent.com/NMCDesignapp/KPI-An-Giang/main/index.html';

function rewriteSharedAssets(html) {
    return String(html || '')
        .replace(/href=(["'])style\.css\1/g, 'href="/api/shared?file=style.css"')
        .replace(/src=(["'])app\.js\1/g, 'src="/api/shared?file=app.js"');
}

module.exports = async function handler(req, res) {
    let html = '';
    try {
        const response = await fetch(ROOT_INDEX, {
            cache: 'no-store',
            headers: { 'User-Agent': 'KPI-An-Giang-Shared-Deploy' }
        });
        if (!response.ok) throw new Error('index.html: HTTP ' + response.status);
        html = await response.text();
    } catch (error) {
        console.error('[shared-index] remote index failed, using local fallback', error);
        try {
            html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
        } catch (fallbackError) {
            console.error('[shared-index] local fallback failed', fallbackError);
            res.status(502).send('Không thể tải giao diện KPI.');
            return;
        }
    }

    html = rewriteSharedAssets(html);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).send(html);
};
