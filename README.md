# SERVICE BOOKING MANAGEMENT SYSTEM
> **Hệ thống Quản lý Đặt lịch Dịch vụ Trực tuyến (Full-Stack Assessment Demo)**  
> Được xây dựng chuẩn kiến trúc theo toàn bộ yêu cầu trong tài liệu [`REQUIREMENTS.md`](REQUIREMENTS.md).

[![.NET 8](https://img.shields.io/badge/.NET-8.0-purple.svg)](https://dotnet.microsoft.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2%20(App%20Router)-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose%20Ready-2496ed.svg)](https://www.docker.com/)

---

## 1. TỔNG QUAN HỆ THỐNG

Dự án mô phỏng toàn diện luồng nghiệp vụ đặt lịch dịch vụ trực tuyến giữa Khách hàng (`Customer`) và Cơ sở quản trị (`Admin`), đảm bảo các tiêu chuẩn khắt khe về kiến trúc phân tầng, phân quyền chống IDOR và thuật toán chống trùng lịch (`Conflict Detection Algorithm`).

### Tech Stack cốt lõi:
- **Backend**: C# / ASP.NET Core 8 Web API, Entity Framework Core 8, JWT Authentication, BCrypt.
- **Frontend**: Next.js 14 (App Router), TypeScript (Strict Mode, không dùng `any`), Tailwind CSS, Lucide Icons.
- **Database**: PostgreSQL 16 (triển khai Docker) & SQLite (hỗ trợ chạy local tức thì không cần cài DB server).
- **Kiểm thử**: xUnit, InMemory EF Core, Moq (vượt qua 100% 6 test cases TC1-TC6).
- **Containerization**: Docker Compose đóng gói đồng bộ DB, Backend và Frontend.

---

## 2. TÀI KHOẢN DÙNG THỬ (DEMO SEED ACCOUNTS)

Hệ thống đã tự động nạp sẵn dữ liệu mẫu khi khởi động. Tại trang đăng nhập (`/login`), có sẵn **nút bấm điền nhanh (Fast Fill)** cho từng tài khoản:

| Vai trò (Role) | Email | Mật khẩu | Quyền hạn & Mục đích kiểm thử |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@booking.com` | `Admin123!` | Quản lý danh mục dịch vụ, xếp lịch nhân viên, xem toàn bộ booking, duyệt/hoàn tất/hủy booking. |
| **Customer 1** | `customer1@demo.com` | `Password123!` | Đặt lịch hẹn, xem khung giờ trống, xem danh sách lịch hẹn cá nhân, hủy lịch cá nhân. |
| **Customer 2** | `customer2@demo.com` | `Password123!` | Dùng kiểm thử chống lỗ hổng IDOR (không thể xem/sửa lịch của Customer 1). |

---

## 3. CẤU TRÚC THƯ MỤC CHUẨN DỰ ÁN

Codebase được tổ chức phân lập và module hóa chặt chẽ theo tiêu chuẩn Clean Architecture:

```text
Booking/
├── README.md                           # Bàn giao & hướng dẫn chạy dự án
├── docker-compose.yml                  # Docker orchestration (Postgres, Backend API, Frontend)
├── REQUIREMENTS.md                     # Tài liệu yêu cầu nghiệp vụ gốc
├── .gitignore                          # Cấu hình gitignore cho .NET, Node, SQLite, OS
│
├── agent/                              # Workspace chuyên dụng cho AI Coding Agent & Pair Programming
│   ├── README.md                       # Giới thiệu cơ chế phối hợp agent
│   ├── AGENT_INSTRUCTIONS.md           # Quy tắc cốt lõi, tiêu chuẩn code & các bất biến nghiệp vụ
│   ├── personas/                       # Chân dung chuyên gia (Backend, Frontend, QA Engineer)
│   ├── workflows/                      # Quy trình phát triển tính năng & checklist code review
│   └── prompts/                        # Mẫu prompt chuyên dụng cho phát triển, debug, test
│
├── docs/                               # Bộ tài liệu kỹ thuật & đặc tả hệ thống
│   ├── README.md                       # Mục lục tài liệu kỹ thuật
│   ├── architecture.md                 # Kiến trúc phân tầng, luồng xử lý & sơ đồ tuần tự
│   ├── database-erd.md                 # Mô hình CSDL quan hệ & Mermaid ERD
│   ├── business-rules.md               # Chi tiết thuật toán chống trùng lịch & quy tắc nghiệp vụ
│   ├── api-specification.md            # Đặc tả toàn bộ RESTful API endpoints & RFC 7807
│   ├── test-cases.md                   # Bảng đặc tả 6 ca kiểm thử nghiệp vụ then chốt (TC1-TC6)
│   └── setup-guide.md                  # Hướng dẫn chi tiết thiết lập môi trường & deployment
│
├── backend/                            # ASP.NET Core 8 Web API & EF Core
│   ├── BookingSystem.sln
│   ├── Dockerfile
│   ├── src/
│   │   └── BookingSystem.Api/
│   │       ├── Controllers/            # Auth, Services, Staffs, Bookings Controllers
│   │       ├── Data/                   # ApplicationDbContext, DbInitializer (Seed Data)
│   │       ├── Models/
│   │       │   ├── Entities/           # User, Service, Staff, WorkSchedule, Booking
│   │       │   ├── DTOs/               # DTOs Request/Response theo từng module
│   │       │   └── Enums/              # BookingStatus, UserRole
│   │       ├── Services/               # Business logic, thuật toán chống trùng, tính slot
│   │       ├── Common/                 # Custom Exceptions & Global Exception Middleware
│   │       ├── appsettings.json
│   │       └── Program.cs
│   └── tests/
│       └── BookingSystem.Tests/        # Bộ kiểm thử tự động xUnit (TC1 -> TC6)
│
└── frontend/                           # Next.js 14 App Router, TypeScript, Tailwind CSS
    ├── Dockerfile
    ├── package.json
    ├── .env.example
    ├── .env.local
    └── src/
        ├── app/
        │   ├── layout.tsx              # Root layout kèm Navbar, Footer
        │   ├── page.tsx                # Redirect sang /services
        │   ├── login/page.tsx          # Đăng nhập kèm Fast-fill demo accounts
        │   ├── services/page.tsx       # Danh sách dịch vụ kèm tìm kiếm & đặt lịch
        │   ├── booking/page.tsx        # Luồng đặt lịch 4 bước, tính slot, báo 409 conflict
        │   ├── my-bookings/page.tsx    # Lịch của tôi, bộ lọc trạng thái, popup hủy lịch
        │   └── admin/                  # Portal Quản trị viên
        │       ├── bookings/page.tsx   # Quản trị toàn bộ booking, duyệt/hoàn tất/hủy
        │       ├── services/page.tsx   # CRUD Dịch vụ, đổi trạng thái khóa/mở
        │       └── schedules/page.tsx  # Xếp ca làm việc cho nhân viên theo ngày
        ├── components/
        │   ├── layout/                 # Navbar, Footer, AdminNav
        │   └── feedback/               # LoadingSkeleton, EmptyState, ErrorAlert
        ├── lib/                        # api-client, auth helpers, formatters
        └── types/                      # TypeScript definitions đồng bộ 100% Backend DTOs
```

---

## 4. HƯỚNG DẪN KHỞI CHẠY (QUICK START)

### Cách 1: Khởi chạy bằng Docker Compose (Khuyên dùng)
Yêu cầu: Đã bật Docker Desktop.
```bash
docker compose up --build
```
Hệ thống sẽ khởi tạo đồng thời:
- Frontend: `http://localhost:3000`
- Backend API & Swagger: `http://localhost:5000/swagger`
- PostgreSQL: `localhost:5432`

---

### Cách 2: Khởi chạy thủ công từ Terminal (Local Development)

#### 1. Chạy Backend (ASP.NET Core 8):
```bash
cd backend/src/BookingSystem.Api
dotnet run
```
API tự động khởi tạo database SQLite `booking.db` và nạp toàn bộ Seed Data.  
Truy cập Swagger kiểm tra: **`http://localhost:5000/swagger`**

#### 2. Chạy Frontend (Next.js 14):
```bash
cd frontend
npm run dev
```
Mở trình duyệt truy cập: **`http://localhost:3000`**

---

## 5. BỘ KIỂM THỬ NGHIỆP VỤ (XUNIT TESTS TC1 - TC6)

Bộ kiểm thử tự động xUnit đã được viết sẵn trong `backend/tests/BookingSystem.Tests`. Để thực thi:
```bash
cd backend
dotnet test
```

### Kết quả kiểm chứng:
- **TC1**: Đặt lịch trong quá khứ (`StartTime < UtcNow`) $\to$ **PASS** (400 Bad Request).
- **TC2**: Đặt lịch ngoài ca làm việc của nhân viên $\to$ **PASS** (400 Bad Request).
- **TC3**: Đặt trùng lịch (`NewStart < ExistingEnd && NewEnd > ExistingStart`) $\to$ **PASS** (409 Conflict).
- **TC4**: Chống lỗ hổng IDOR, Customer A không thể can thiệp booking Customer B $\to$ **PASS** (Claims-based Security).
- **TC5**: Customer không được phép tự chuyển trạng thái sang `Confirmed`/`Completed` $\to$ **PASS** (403 Forbidden).
- **TC6**: Chặn hủy lịch hẹn đã hoàn thành hoặc đã qua giờ bắt đầu $\to$ **PASS** (400 Bad Request).

---

## 6. MA TRẬN TIÊU CHÍ HOÀN THÀNH (COMPLETION CHECKLIST)

| Hạng mục | Yêu cầu trong `REQUIREMENTS.md` | Trạng thái |
| :--- | :--- | :---: |
| **Backend** | ASP.NET Core Web API 8, DTO Pattern, Entity Framework Core | **Hoàn thành 100%** |
| **Frontend** | Next.js 14 App Router, TypeScript Strict, Tailwind CSS, 3 UI States | **Hoàn thành 100%** |
| **Database** | 5 Entities chuẩn hóa, Composite Index cho Conflict Check, Seed Data | **Hoàn thành 100%** |
| **Xử lý xung đột** | Công thức chống trùng lịch chuẩn xác, trả mã HTTP 409 Conflict | **Hoàn thành 100%** |
| **Bảo mật** | JWT Bearer, băm BCrypt, Claims Authorization, chống IDOR | **Hoàn thành 100%** |
| **Giao diện** | Đầy đủ 7 màn hình theo đặc tả (Login, Services, Booking, My Bookings, Admin Bookings/Services/Schedules) | **Hoàn thành 100%** |
| **Docker** | `docker-compose.yml`, Dockerfiles cho Backend và Frontend | **Hoàn thành 100%** |
| **Bộ tài liệu** | Thư mục `docs/` chi tiết: Architecture, ERD, API Specs, Business Rules, Setup | **Hoàn thành 100%** |
| **Agent Workspace** | Thư mục `agent/`: Instructions, Personas, Workflows, Prompts | **Hoàn thành 100%** |
