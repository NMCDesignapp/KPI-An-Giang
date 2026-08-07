const RAW_BASE = 'https://raw.githubusercontent.com/NMCDesignapp/KPI-An-Giang/main/';

const TYPES = {
    'style.css': 'text/css; charset=utf-8',
    'ui-theme.css': 'text/css; charset=utf-8',
    'app.js': 'application/javascript; charset=utf-8',
    'kpi-bg.webp': 'image/webp',
    'nc-kpi-logo.webp': 'image/webp'
};

async function fetchRaw(file) {
    const response = await fetch(RAW_BASE + file, {
        cache: 'no-store',
        headers: { 'User-Agent': 'KPI-An-Giang-Shared-Deploy' }
    });
    if (!response.ok) throw new Error(file + ': HTTP ' + response.status);
    return response;
}

module.exports = async function handler(req, res) {
    let file = req.query && req.query.file;
    if (Array.isArray(file)) file = file[0];
    if (!TYPES[file]) {
        res.status(400).json({ error: 'Unsupported shared file' });
        return;
    }

    try {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Content-Type', TYPES[file]);

        if (file === 'style.css') {
            const responses = await Promise.all([
                fetchRaw('style.css'),
                fetchRaw('ui-theme.css')
            ]);
            const css = (await responses[0].text()) +
                '\n\n/* Shared NMC technology theme */\n' +
                (await responses[1].text());
            res.status(200).send(css);
            return;
        }

        const response = await fetchRaw(file);
        const buffer = Buffer.from(await response.arrayBuffer());
        res.status(200).send(buffer);
    } catch (error) {
        console.error('[shared]', file, error);
        res.setHeader('Cache-Control', 'no-store');
        res.status(502).json({ error: 'Unable to load shared KPI file' });
    }
};
