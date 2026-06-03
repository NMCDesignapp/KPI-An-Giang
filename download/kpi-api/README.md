# KPI BVNT An Giang — Calendar API

## Deploy lên Vercel (1 lần duy nhất)

### Bước 1: Tạo Upstash Redis (FREE)
1. Vào https://upstash.com → Đăng ký (dùng GitHub)
2. Tạo Redis database → tên: `kpi-bvnt-ag`
3. Vào tab **REST API** → Copy 2 giá trị:
   - `UPSTASH_REDIS_REST_URL` (ví dụ: `https://xxx-xxxxx.upstash.io`)
   - `UPSTASH_REDIS_REST_TOKEN` (ví dụ: `Axxx...`)

### Bước 2: Deploy lên Vercel
1. Vào https://vercel.com → Đăng nhập bằng GitHub
2. **Add New Project** → Import GitHub repo `NMCDesignapp/KPI-An-Giang`
3. **Root Directory** → Chọn thư mục `kpi-api`
4. **Environment Variables** → Thêm 2 biến:
   - `UPSTASH_REDIS_REST_URL` = *(URL từ bước 1)*
   - `UPSTASH_REDIS_REST_TOKEN` = *(Token từ bước 1)*
5. Nhấn **Deploy**

### Bước 3: Lấy API URL
Sau khi deploy xong, Vercel sẽ cấp URL dạng:
- `https://kpi-bvnt-ag-api.vercel.app`

### Bước 4: Cập nhật API URL trong PWA
Trong file `index.html`, tìm dòng:
```
var CAL_API_URL = '';
```
Thay bằng:
```
var CAL_API_URL = 'https://kpi-bvnt-ag-api.vercel.app';
```

---

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/entries?month=06` | Lấy kế hoạch theo tháng |
| POST | `/api/entries` | Thêm kế hoạch mới |
| DELETE | `/api/entries?id=xxx&month=06&pw=123456` | Xóa kế hoạch |

## POST Body
```json
{
  "ngay_kh": 15,
  "thangkh": "06",
  "noi_dung": "Họp đánh giá quý 2",
  "phu_trach": "HTKD, CÔNG TY"
}
```

## Chi phí
- **Upstash Redis Free**: 10,000 requests/ngày, 256MB storage
- **Vercel Free**: 100GB bandwidth, serverless functions
- → **Hoàn toàn miễn phí** cho quy mô nhỏ
