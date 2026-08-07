const RAW_BASE = 'https://raw.githubusercontent.com/NMCDesignapp/KPI-An-Giang/main/';

async function fetchText(file) {
    const response = await fetch(RAW_BASE + file, {
        cache: 'no-store',
        headers: { 'User-Agent': 'KPI-An-Giang-Vercel' }
    });
    if (!response.ok) throw new Error(file + ': HTTP ' + response.status);
    return response.text();
}

module.exports = async function handler(req, res) {
    try {
        const parts = await Promise.all([
            fetchText('style.css'),
            fetchText('ui-theme.css')
        ]);
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.status(200).send(parts[0] + '\n\n/* Shared NMC technology theme */\n' + parts[1]);
    } catch (error) {
        console.error('[theme-style]', error);
        res.setHeader('Cache-Control', 'no-store');
        res.status(502).send('/* Unable to load KPI stylesheet */');
    }
};
