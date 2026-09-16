# BỘ KIỂM THỬ TỐI THIỂU (MINIMUM TEST CASES GUIDE)
## Service Booking Management System

Tài liệu này hướng dẫn chi tiết kịch bản kiểm thử cho 6 test case nghiệp vụ bắt buộc theo yêu cầu của dự án (TC1 đến TC6).

---

## 1. BẢNG TỔNG HỢP TEST CASES

| Mã Test | Tên kịch bản | Mô tả chi tiết | Kỳ vọng trả về | Mã HTTP |
| :---: | :--- | :--- | :--- | :---: |
| **TC1** | Booking in the Past | Khách hàng thử đặt lịch vào một thời điểm trong quá khứ (`StartTime < DateTime.UtcNow`). | Bị từ chối, trả về lỗi validation thời gian không hợp lệ. | `400 Bad Request` |
| **TC2** | Out of Work Schedule | Thử đặt lịch vào khung giờ nhân viên không có ca làm việc hoặc vượt quá giờ kết thúc ca. | Bị từ chối, trả về lỗi thời gian nằm ngoài lịch làm việc của nhân viên. | `400 Bad Request` |
| **TC3** | Conflict Detection | Đặt 2 booking có thời gian giao nhau hoặc trùng giờ với cùng 1 nhân viên (`NewStart < ExistingEnd && NewEnd > ExistingStart`). | Bị từ chối, báo lỗi xung đột lịch với booking hiện có. | `409 Conflict` |
| **TC4** | IDOR Prevention | Customer A cố tình truy cập hoặc xem thông tin booking của Customer B bằng cách đoán ID. | Bị chặn, không tiết lộ dữ liệu người khác. | `403 Forbidden` hoặc `404 Not Found` |
| **TC5** | Role Status Transition | Customer cố tình gửi request đổi trạng thái booking thành `Confirmed` hoặc `Completed`. | Bị chặn do không có quyền Admin. | `403 Forbidden` |
| **TC6** | Invalid Cancellation | Cố tình hủy booking đã ở trạng thái `Completed` hoặc booking đã quá giờ hẹn (`StartTime <= UtcNow`). | Bị từ chối, không cho phép hủy. | `400 Bad Request` |

---

## 2. CHI TIẾT TỪNG TEST CASE VÀ PAYLOAD TEST

### TC1: Thử đặt lịch trong quá khứ
- **Request**:
  ```http
  POST /api/bookings
  Authorization: Bearer <Customer_Token>
  {
    "serviceId": 1,
    "staffId": 1,
    "startTime": "2020-01-01T09:00:00Z",
    "customerNote": "Thử đặt quá khứ"
  }
  ```
- **Kết quả mong đợi**: HTTP `400 Bad Request` kèm message `"Thời gian bắt đầu đặt lịch phải lớn hơn thời điểm hiện tại"`.

### TC2: Thử đặt ngoài ca làm việc của nhân viên
- **Giả định**: Nhân viên 1 chỉ có ca làm việc từ `08:00` đến `17:00` ngày `2026-09-20`.
- **Request**:
  ```http
  POST /api/bookings
  Authorization: Bearer <Customer_Token>
  {
    "serviceId": 1, // Dịch vụ dài 60 phút
    "staffId": 1,
    "startTime": "2026-09-20T16:30:00Z", // Kết thúc lúc 17:30 > 17:00
    "customerNote": "Đặt quá giờ làm việc"
  }
  ```
- **Kết quả mong đợi**: HTTP `400 Bad Request` kèm message `"Khung giờ đặt lịch nằm ngoài ca làm việc của nhân viên"`.

### TC3: Đặt lịch trùng giờ (Conflict Detection)
- **Bước 1**: Đặt thành công Booking 1 cho Nhân viên 1 từ `09:00` đến `10:00`.
- **Bước 2**: Đặt Booking 2 cho Nhân viên 1 từ `09:30` đến `10:30`.
- **Kết quả mong đợi**: Booking 2 bị từ chối với HTTP `409 Conflict` kèm message `"Nhân viên đã có lịch hẹn trong khung giờ này"`.

### TC4: Chống lỗ hổng IDOR giữa các khách hàng
- **Bước 1**: Khách hàng A đăng nhập, lấy token A.
- **Bước 2**: Khách hàng B tạo booking ID = `10`.
- **Bước 3**: Khách hàng A gọi `GET /api/bookings/10` hoặc xem danh sách `GET /api/bookings/my-bookings`.
- **Kết quả mong đợi**: Token A không bao giờ thấy booking ID `10` của B. Trả về `403 Forbidden` hoặc `404 Not Found`.

### TC5: Customer cố tình đổi trạng thái sang `Confirmed` hoặc `Completed`
- **Request**:
  ```http
  PATCH /api/bookings/1/status
  Authorization: Bearer <Customer_Token>
  {
    "status": "Confirmed"
  }
  ```
- **Kết quả mong đợi**: HTTP `403 Forbidden` (Chỉ Admin mới có quyền thực hiện thao tác này).

### TC6: Chặn hủy booking đã hoàn thành hoặc đã quá giờ bắt đầu
- **Request**:
  ```http
  POST /api/bookings/5/cancel
  Authorization: Bearer <Customer_Token>
  {
    "cancellationReason": "Muốn hủy sau khi làm xong"
  }
  ```
- **Kết quả mong đợi**: Nếu booking 5 đã `Completed` hoặc đã qua `StartTime`, trả về HTTP `400 Bad Request` kèm lý do cụ thể.

---

## 3. LỆNH CHẠY AUTOMATED TESTS
Để chạy bộ kiểm thử tự động xUnit từ terminal:
```bash
cd backend
dotnet test
```
