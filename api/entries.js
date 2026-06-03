/**
 * KPI BVNT An Giang — Shared Calendar Entries API
 * Uses Neon PostgreSQL for persistent shared storage
 *
 * GET    /api/entries?month=06       → Get entries for a month
 * POST   /api/entries                → Create new entry { ngay_kh, thangkh, noi_dung, phu_trach }
 * PUT    /api/entries?id=x&pw=123456 → Update entry by id
 * DELETE /api/entries?id=x&pw=123456 → Delete entry by id
 */

const { neon } = require('@neondatabase/serverless');

const CAL_PW = '123456';

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // ===== GET: Fetch entries for a month =====
    if (req.method === 'GET') {
      const month = String(req.query.month || '').padStart(2, '0');
      if (!month) {
        return res.status(400).json({ error: 'Missing month parameter' });
      }
      const rows = await sql`
        SELECT id, ngay_kh, thangkh, noi_dung, phu_trach, source, created_at
        FROM calendar_entries
        WHERE thangkh = ${month}
        ORDER BY ngay_kh ASC, id ASC
      `;
      return res.status(200).json(rows);
    }

    // ===== POST: Create new entry =====
    if (req.method === 'POST') {
      const { ngay_kh, thangkh, noi_dung, phu_trach } = req.body || {};

      if (!ngay_kh || !thangkh || !noi_dung || !phu_trach) {
        return res.status(400).json({ error: 'Thiếu thông tin: ngay_kh, thangkh, noi_dung, phu_trach' });
      }

      const result = await sql`
        INSERT INTO calendar_entries (ngay_kh, thangkh, noi_dung, phu_trach, source)
        VALUES (${Number(ngay_kh)}, ${String(thangkh).padStart(2, '0')}, ${String(noi_dung)}, ${String(phu_trach)}, 'user')
        RETURNING id, ngay_kh, thangkh, noi_dung, phu_trach, source, created_at
      `;

      return res.status(201).json(result[0]);
    }

    // ===== PUT: Update entry by id =====
    if (req.method === 'PUT') {
      const { id, pw } = req.query;
      if (pw !== CAL_PW) {
        return res.status(403).json({ error: 'Sai mật khẩu' });
      }
      if (!id) {
        return res.status(400).json({ error: 'Missing id' });
      }
      const { ngay_kh, thangkh, noi_dung, phu_trach } = req.body || {};
      if (!ngay_kh || !thangkh || !noi_dung || !phu_trach) {
        return res.status(400).json({ error: 'Thiếu thông tin: ngay_kh, thangkh, noi_dung, phu_trach' });
      }
      const result = await sql`
        UPDATE calendar_entries
        SET ngay_kh = ${Number(ngay_kh)}, thangkh = ${String(thangkh).padStart(2, '0')},
            noi_dung = ${String(noi_dung)}, phu_trach = ${String(phu_trach)}
        WHERE id = ${Number(id)}
        RETURNING id, ngay_kh, thangkh, noi_dung, phu_trach, source, created_at
      `;
      if (result.length === 0) {
        return res.status(404).json({ error: 'Không tìm thấy mục' });
      }
      return res.status(200).json(result[0]);
    }

    // ===== DELETE: Remove entry by id =====
    if (req.method === 'DELETE') {
      const { id, pw } = req.query;
      if (pw !== CAL_PW) {
        return res.status(403).json({ error: 'Sai mật khẩu' });
      }
      if (!id) {
        return res.status(400).json({ error: 'Missing id' });
      }
      const result = await sql`
        DELETE FROM calendar_entries WHERE id = ${Number(id)}
        RETURNING id
      `;
      if (result.length === 0) {
        return res.status(404).json({ error: 'Không tìm thấy mục' });
      }
      return res.status(200).json({ success: true, removed: 1 });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[KPI-API Error]', err.message);
    return res.status(500).json({ error: 'Lỗi server', detail: err.message });
  }
};
