# QUY TẮC NGHIỆP VỤ BẮT BUỘC (CRITICAL BUSINESS RULES)
## Service Booking Management System

Tài liệu này tổng hợp toàn bộ các quy tắc nghiệp vụ cốt lõi mà Backend bắt buộc phải kiểm tra độc lập và bảo vệ tính toàn vẹn dữ liệu.

---

## 1. QUY TẮC TÍNH TOÁN THỜI GIAN KẾT THÚC (ENDTIME CALCULATION)

- **Nguyên tắc**: Khách hàng chỉ chọn `StartTime` khi gửi request đặt lịch.
- **Backend xử lý**:
  - Truy vấn thời lượng `DurationMinutes` từ bảng `Services` trong database dựa vào `ServiceId`.
  - Tự động tính toán:
    $$\text{EndTime} = \text{StartTime} + \text{TimeSpan.FromMinutes}(\text{DurationMinutes})$$
- **Bảo mật**: Tuyệt đối không nhận `EndTime` hoặc `DurationMinutes` từ payload của client gửi lên để ngăn chặn việc chỉnh sửa thời gian dịch vụ trái phép.

---

## 2. QUY TẮC THỜI GIAN ĐẶT LỊCH HỢP LỆ (VALID SCHEDULING WINDOW)

1. **Không đặt lịch trong quá khứ**:
   $$\text{StartTime} > \text{DateTime.UtcNow}$$
   Nếu vi phạm: Ném lỗi `400 Bad Request` ("Thời gian bắt đầu đặt lịch phải lớn hơn thời điểm hiện tại").

2. **Nằm trọn vẹn trong ca làm việc (`WorkSchedule`)**:
   - Khách chỉ được đặt vào ngày mà nhân viên đã được phân ca làm việc.
   - Toàn bộ khoảng thời gian booking $[\text{StartTime}, \text{EndTime}]$ phải nằm hoàn toàn trong ca làm việc $[\text{Schedule.StartTime}, \text{Schedule.EndTime}]$ của ngày đó:
     $$\text{Schedule.StartTime} \le \text{Booking.StartTime} < \text{Booking.EndTime} \le \text{Schedule.EndTime}$$
   - Nếu nhân viên không có ca làm việc vào ngày đó, hoặc thời gian đặt lịch bị lố giờ ca làm việc: Ném lỗi `400 Bad Request` ("Khung giờ đặt lịch nằm ngoài thời gian làm việc của nhân viên").

3. **Trạng thái hoạt động của thực thể**:
   - Dịch vụ phải đang hoạt động (`Service.IsActive == true`).
   - Nhân viên phải đang hoạt động (`Staff.IsActive == true`).
   - Nếu bị khóa: Ném lỗi `400 Bad Request`.

---

## 3. THUẬT TOÁN CHỐNG TRÙNG LỊCH (OVERLAP CONFLICT DETECTION)

Hai khoảng thời gian booking của cùng một nhân viên $A = [Start_A, End_A]$ và $B = [Start_B, End_B]$ bị coi là **trùng lịch** khi và chỉ khi thỏa mãn đồng thời:

$$\text{NewStart} < \text{ExistingEnd} \quad \text{AND} \quad \text{NewEnd} > \text{ExistingStart}$$

### Ma trận kiểm thử xung đột:
| Trường hợp | Khoảng hiện có | Khoảng yêu cầu mới | Kết quả | Giải thích logic |
| :--- | :--- | :--- | :---: | :--- |
| **Giao nhau ở đuôi** | `09:00 - 10:00` | `09:30 - 10:30` | **TRÙNG** | $09:30 < 10:00 \land 10:30 > 09:00 \implies \text{True}$ |
| **Giao nhau ở đầu** | `09:00 - 10:00` | `08:30 - 09:30` | **TRÙNG** | $08:30 < 10:00 \land 09:30 > 09:00 \implies \text{True}$ |
| **Nằm trọn bên trong** | `09:00 - 11:00` | `09:30 - 10:30` | **TRÙNG** | $09:30 < 11:00 \land 10:30 > 09:00 \implies \text{True}$ |
| **Bao trùm toàn bộ** | `09:30 - 10:00` | `09:00 - 10:30` | **TRÙNG** | $09:00 < 10:00 \land 10:30 > 09:30 \implies \text{True}$ |
| **Liền kề phía sau** | `09:00 - 10:00` | `10:00 - 11:00` | **KHÔNG TRÙNG** | $10:00 < 10:00$ là $\text{False}$ (Hợp lệ) |
| **Liền kề phía trước** | `09:00 - 10:00` | `08:00 - 09:00` | **KHÔNG TRÙNG** | $09:00 > 09:00$ là $\text{False}$ (Hợp lệ) |

### Điều kiện lọc:
- Chỉ kiểm tra trùng lịch với các booking **chưa bị hủy** (`Status != BookingStatus.Cancelled`).
- Nếu phát hiện trùng lịch: API bắt buộc phản hồi mã **`HTTP 409 Conflict`** kèm thông báo: `"Nhân viên đã có lịch hẹn trong khung giờ này. Vui lòng chọn khung giờ khác."`

---

## 4. QUY TẮC PHÂN QUYỀN VÀ BẢO VỆ DỮ LIỆU (AUTHORIZATION & IDOR PREVENTION)

1. **Quyền riêng tư Customer (Chống IDOR)**:
   - Khi Customer gọi `GET /api/bookings/my-bookings`, Backend chỉ truy vấn booking có `CustomerId == CurrentUser.Id` (được giải mã trực tiếp từ Claims của JWT token).
   - Tuyệt đối không cho phép Customer xem hoặc can thiệp booking của Customer khác thông qua việc thay đổi ID trên URL.
2. **Quyền cập nhật trạng thái**:
   - Chỉ người dùng có vai trò `Admin` mới được phép đổi trạng thái sang `Confirmed` hoặc `Completed`.
   - Nếu Customer cố tình gọi API này: Backend trả về **`HTTP 403 Forbidden`**.

---

## 5. QUY TẮC HỦY BOOKING (CANCELLATION RULES)

1. **Quyền hủy**:
   - Customer chỉ được phép hủy booking của chính mình.
   - Admin có quyền hủy bất kỳ booking nào nếu cần thiết.
2. **Điều kiện chặn hủy**:
   - **Không được hủy booking đã hoàn thành**: Nếu `booking.Status == BookingStatus.Completed` -> Ném lỗi `400 Bad Request` ("Không thể hủy booking đã hoàn thành").
   - **Không được hủy booking đã bắt đầu hoặc đã qua giờ hẹn**: Nếu `booking.StartTime <= DateTime.UtcNow` -> Ném lỗi `400 Bad Request` ("Không thể hủy booking đã bắt đầu hoặc đã qua thời gian hẹn").
3. **Bắt buộc nhập lý do**:
   - Payload hủy booking bắt buộc phải có `CancellationReason` không được để trống.
4. **Giải phóng slot**:
   - Ngay sau khi booking chuyển trạng thái sang `Cancelled`, khung giờ đó lập tức được coi là trống để khách hàng khác có thể đặt lại.
