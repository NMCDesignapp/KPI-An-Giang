/**
 * KPI BVNT An Giang — Shared Calendar Entries API
 * Uses Upstash Redis REST API for persistent shared storage
 * 
 * Setup: Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel Environment Variables
 * Free tier: https://upstash.com → Create Redis → Copy REST URL + Token
 * 
 * GET    /api/entries?month=06       → Get entries for a month
 * POST   /api/entries                → Create new entry { ngay_kh, thangkh, noi_dung, phu_trach }
 * DELETE /api/entries?id=x&month=06&pw=123456 → Delete entry by id
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const CAL_PW = '123456';
const KEY_PREFIX = 'kpi-cal:';

async function redis(command, ...args) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error('Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.');
  }
  const res = await fetch(`${UPSTASH_URL}/${command}/${args.map(a => encodeURIComponent(a)).join('/')}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ===== GET: Fetch entries for a month =====
    if (req.method === 'GET') {
      const month = String(req.query.month || '').padStart(2, '0');
      if (!month) {
        return res.status(400).json({ error: 'Missing month parameter' });
      }
      const key = KEY_PREFIX + month;
      const raw = await redis('GET', key);
      const entries = raw ? JSON.parse(raw) : [];
      return res.status(200).json(entries);
    }

    // ===== POST: Create new entry =====
    if (req.method === 'POST') {
      const { ngay_kh, thangkh, noi_dung, phu_trach } = req.body || {};

      if (!ngay_kh || !thangkh || !noi_dung || !phu_trach) {
        return res.status(400).json({ error: 'Thiếu thông tin: ngay_kh, thangkh, noi_dung, phu_trach' });
      }

      const entry = {
        id: Date.now(),
        ngay_kh: Number(ngay_kh),
        thangkh: String(thangkh).padStart(2, '0'),
        noi_dung: String(noi_dung),
        phu_trach: String(phu_trach),
        source: 'user',
        created: new Date().toISOString()
      };

      const key = KEY_PREFIX + entry.thangkh;
      const raw = await redis('GET', key);
      const entries = raw ? JSON.parse(raw) : [];
      entries.push(entry);
      await redis('SET', key, JSON.stringify(entries));

      return res.status(201).json(entry);
    }

    // ===== DELETE: Remove entry by id =====
    if (req.method === 'DELETE') {
      const { id, month, pw } = req.query;
      if (pw !== CAL_PW) {
        return res.status(403).json({ error: 'Sai mật khẩu' });
      }
      if (!id || !month) {
        return res.status(400).json({ error: 'Missing id or month' });
      }
      const key = KEY_PREFIX + String(month).padStart(2, '0');
      const raw = await redis('GET', key);
      const entries = raw ? JSON.parse(raw) : [];
      const filtered = entries.filter(e => String(e.id) !== String(id));
      await redis('SET', key, JSON.stringify(filtered));
      return res.status(200).json({ success: true, removed: entries.length - filtered.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[KPI-API Error]', err.message);
    return res.status(500).json({ error: 'Lỗi server', detail: err.message });
  }
}
