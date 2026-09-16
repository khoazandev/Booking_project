# HƯỚNG DẪN CÀI ĐẶT & VẬN HÀNH (SETUP & DEPLOYMENT GUIDE)
## Service Booking Management System

Tài liệu này cung cấp hướng dẫn từng bước để thiết lập môi trường phát triển, chạy database migration, nạp dữ liệu mẫu (Seed Data) và chạy hệ thống trên máy local hoặc bằng Docker Compose.

---

## 1. YÊU CẦU MÔI TRƯỜNG TỐI THIỂU

- **.NET SDK**: Phiên bản 8.0 trở lên (Đã cài đặt sẵn tại `%LocalAppData%\Microsoft\dotnet`).
- **Node.js**: Phiên bản 18+ hoặc 20+ LTS (Hiện tại máy: Node v24).
- **Package Manager**: npm hoặc yarn / pnpm.
- **Database**: PostgreSQL 16 hoặc SQLite (dùng cho local development nhanh chóng).
- **Docker Desktop**: (Tùy chọn cho triển khai trọn gói).

---

## 2. TÀI KHOẢN DÙNG THỬ (DEMO SEED ACCOUNTS)

Hệ thống đã chuẩn bị sẵn các tài khoản demo phục vụ kiểm thử:

| Vai trò (Role) | Email | Mật khẩu | Mục đích kiểm thử |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@booking.com` | `Admin123!` | Quản lý dịch vụ, xếp lịch nhân viên, duyệt/hủy toàn bộ booking |
| **Customer 1** | `customer1@demo.com` | `Password123!` | Đặt lịch dịch vụ, xem booking cá nhân, hủy booking cá nhân |
| **Customer 2** | `customer2@demo.com` | `Password123!` | Dùng để kiểm tra chống IDOR (không thấy lịch của Customer 1) |

---

## 3. HƯỚNG DẪN CHẠY BẰNG DOCKER COMPOSE (KHUYẾN NGHỊ)

Chỉ cần chạy một câu lệnh duy nhất tại thư mục gốc của dự án:

```bash
docker compose up --build
```

Hệ thống sẽ tự động khởi động 3 container:
1. **Database PostgreSQL**: Port `5432`
2. **Backend ASP.NET Core API**: Port `5000` (Swagger UI: `http://localhost:5000/swagger`)
3. **Frontend Next.js App**: Port `3000` (`http://localhost:3000`)

Để dừng hệ thống:
```bash
docker compose down
```

---

## 4. HƯỚNG DẪN CHẠY THỦ CÔNG TỪ SOURCE CODE (LOCAL DEVELOPMENT)

### 4.1. Khởi động Backend (ASP.NET Core 8)
1. Mở terminal tại thư mục `backend`:
   ```bash
   cd backend/src/BookingSystem.Api
   ```
2. Khôi phục dependencies và khởi chạy API:
   ```bash
   dotnet restore
   dotnet run
   ```
3. API sẽ lắng nghe tại:
   - Endpoint: `http://localhost:5000`
   - Swagger OpenAPI: `http://localhost:5000/swagger`

### 4.2. Khởi động Frontend (Next.js 14)
1. Mở terminal tại thư mục `frontend`:
   ```bash
   cd frontend
   ```
2. Cài đặt các gói npm:
   ```bash
   npm install
   ```
3. Khởi động môi trường phát triển:
   ```bash
   npm run dev
   ```
4. Mở trình duyệt truy cập: `http://localhost:3000`

---

## 5. CHẠY BỘ TEST TỰ ĐỘNG (XUNIT TESTS)

Tại thư mục `backend`:
```bash
dotnet test BookingSystem.sln
```
Bộ test sẽ thực thi kiểm thử:
- Thuật toán chống trùng lịch (`Overlap Detection Formula`).
- Kiểm tra hợp lệ ca làm việc (`WorkSchedule Window`).
- Kiểm tra tính toán `EndTime`.
- Kiểm tra quy tắc phân quyền và hủy lịch.
