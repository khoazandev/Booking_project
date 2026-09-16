# HỆ THỐNG TÀI LIỆU KỸ THUẬT (PROJECT DOCUMENTATION)
## Service Booking Management System

Thư mục này chứa toàn bộ tài liệu kỹ thuật, kiến trúc hệ thống, đặc tả API, mô hình cơ sở dữ liệu và hướng dẫn vận hành cho dự án.

### Mục lục tài liệu:

1. **[Kiến trúc hệ thống (System Architecture)](architecture.md)**
   - Mô hình phân tầng Backend (Clean Architecture / Separation of Concerns).
   - Kiến trúc Frontend (Next.js 14 App Router, Server/Client components, State management).
   - Biểu đồ luồng dữ liệu và tương tác giữa các hệ thống (Data Flow & Sequence Diagrams).

2. **[Mô hình dữ liệu & ERD (Database Schema & ERD)](database-erd.md)**
   - Chi tiết các bảng: `Users`, `Services`, `Staffs`, `WorkSchedules`, `Bookings`.
   - Sơ đồ thực thể liên kết (Mermaid ERD).
   - Quy ước khóa chính, khóa ngoại, unique index và chiến lược đánh chỉ mục.

3. **[Quy tắc nghiệp vụ lõi (Business Rules)](business-rules.md)**
   - Công thức tính `EndTime` tự động từ `DurationMinutes`.
   - Thuật toán kiểm tra trùng lịch (Conflict / Overlap Detection Formula).
   - Ràng buộc ca làm việc của nhân viên (`WorkSchedule`).
   - Phân quyền vai trò (Admin vs Customer) và quy tắc hủy booking (chống IDOR).

4. **[Đặc tả API (API Specification)](api-specification.md)**
   - Danh sách RESTful endpoints: Auth, Services, Staffs, Schedules, Bookings.
   - Định dạng Request & Response DTOs chuẩn RFC 7807 (Problem Details).
   - Bảng mã lỗi HTTP và ý nghĩa nghiệp vụ.

5. **[Bộ kiểm thử nghiệp vụ (Test Cases Guide)](test-cases.md)**
   - Đặc tả chi tiết 6 Test Cases then chốt (TC1 -> TC6).
   - Dữ liệu đầu vào, kết quả mong đợi và lệnh kiểm thử tự động xUnit.

6. **[Hướng dẫn cài đặt & vận hành (Setup Guide)](setup-guide.md)**
   - Hướng dẫn cài đặt môi trường (.NET 8, Node.js, PostgreSQL/SQLite).
   - Hướng dẫn chạy Migration và Seed Data.
   - Hướng dẫn khởi chạy bằng Docker Compose chỉ với 1 câu lệnh.
   - Danh sách tài khoản thử nghiệm (Admin & Customer).
