# ĐẶC TẢ API (RESTFUL API SPECIFICATION)
## Service Booking Management System

Tài liệu này định nghĩa toàn bộ danh sách RESTful endpoints, định dạng dữ liệu truyền nhận (Request/Response DTO), mã trạng thái HTTP và cơ chế xác thực JWT.

---

## 1. QUY ƯỚC CHUNG

- **Base URL**: `http://localhost:5000/api`
- **Authentication**: Bearer JWT Token gửi qua Header: `Authorization: Bearer <token>`
- **Định dạng dữ liệu**: JSON (`Content-Type: application/json`)
- **Định dạng lỗi chuẩn (RFC 7807 Problem Details)**:
  ```json
  {
    "status": 409,
    "title": "Conflict",
    "detail": "Nhân viên đã có lịch hẹn trong khung giờ này. Vui lòng chọn khung giờ khác.",
    "instance": "/api/bookings"
  }
  ```

---

## 2. NHÓM API AUTHENTICATION (`/api/auth`)

### 2.1. Đăng nhập
- **Endpoint**: `POST /api/auth/login`
- **Quyền hạn**: Public
- **Request Body**:
  ```json
  {
    "email": "customer1@demo.com",
    "password": "Password123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": 2,
      "email": "customer1@demo.com",
      "fullName": "Nguyễn Văn A",
      "role": "Customer"
    }
  }
  ```

### 2.2. Lấy thông tin tài khoản hiện tại
- **Endpoint**: `GET /api/auth/me`
- **Quyền hạn**: Authenticated (Bearer Token)
- **Response `200 OK`**:
  ```json
  {
    "id": 2,
    "email": "customer1@demo.com",
    "fullName": "Nguyễn Văn A",
    "role": "Customer"
  }
  ```

---

## 3. NHÓM API DỊCH VỤ (`/api/services`)

### 3.1. Lấy danh sách dịch vụ
- **Endpoint**: `GET /api/services`
- **Quyền hạn**: Public / Authenticated (Nếu là Customer chỉ thấy `isActive=true`, nếu là Admin thấy tất cả)
- **Query Params**:
  - `search`: string (tìm theo tên dịch vụ)
  - `isActive`: boolean (lọc theo trạng thái)
  - `page`: number (mặc định 1)
  - `pageSize`: number (mặc định 10)
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": 1,
        "name": "Cắt tóc nam tiêu chuẩn",
        "description": "Tư vấn kiểu tóc phù hợp khuôn mặt và gội xả",
        "durationMinutes": 30,
        "price": 100000,
        "isActive": true
      }
    ],
    "totalCount": 5,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
  ```

### 3.2. Tạo mới dịch vụ
- **Endpoint**: `POST /api/services`
- **Quyền hạn**: `Admin`
- **Request Body**:
  ```json
  {
    "name": "Chăm sóc da mặt chuyên sâu",
    "description": "Làm sạch, tẩy tế bào chết và massage thư giãn",
    "durationMinutes": 60,
    "price": 350000,
    "isActive": true
  }
  ```
- **Response `201 Created`**

### 3.3. Cập nhật dịch vụ
- **Endpoint**: `PUT /api/services/{id}`
- **Quyền hạn**: `Admin`
- **Request Body**:
  ```json
  {
    "name": "Chăm sóc da mặt chuyên sâu (Cập nhật)",
    "description": "Mô tả mới",
    "durationMinutes": 60,
    "price": 380000,
    "isActive": true
  }
  ```
- **Response `200 OK`**

---

## 4. NHÓM API NHÂN VIÊN & LỊCH LÀM VIỆC (`/api/staffs`)

### 4.1. Lấy danh sách nhân viên
- **Endpoint**: `GET /api/staffs`
- **Quyền hạn**: Public / Authenticated
- **Query Params**: `isActive`: boolean
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "fullName": "Trần Văn Thợ 1",
      "email": "staff1@salon.com",
      "isActive": true
    }
  ]
  ```

### 4.2. Lấy lịch làm việc của nhân viên
- **Endpoint**: `GET /api/staffs/{id}/schedules`
- **Query Params**: `from` (yyyy-MM-dd), `to` (yyyy-MM-dd)
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 10,
      "staffId": 1,
      "workDate": "2026-09-20",
      "startTime": "08:00:00",
      "endTime": "17:00:00"
    }
  ]
  ```

### 4.3. Thiết lập ca làm việc mới cho nhân viên
- **Endpoint**: `POST /api/staffs/{id}/schedules`
- **Quyền hạn**: `Admin`
- **Request Body**:
  ```json
  {
    "workDate": "2026-09-20",
    "startTime": "08:00:00",
    "endTime": "17:00:00"
  }
  ```
- **Response `201 Created`**

---

## 5. NHÓM API ĐẶT LỊCH (`/api/bookings`)

### 5.1. Tính toán khung giờ còn trống (Available Slots)
- **Endpoint**: `GET /api/bookings/available-slots`
- **Quyền hạn**: Authenticated / Public
- **Query Params**:
  - `staffId`: int (Bắt buộc)
  - `serviceId`: int (Bắt buộc)
  - `date`: yyyy-MM-dd (Bắt buộc)
- **Response `200 OK`**:
  ```json
  [
    {
      "startTime": "2026-09-20T08:00:00Z",
      "endTime": "2026-09-20T08:30:00Z",
      "isAvailable": true
    },
    {
      "startTime": "2026-09-20T08:30:00Z",
      "endTime": "2026-09-20T09:00:00Z",
      "isAvailable": false,
      "conflictReason": "Đã có khách đặt"
    }
  ]
  ```

### 5.2. Khách hàng tạo mới booking
- **Endpoint**: `POST /api/bookings`
- **Quyền hạn**: `Customer` (Lấy CustomerId từ Token)
- **Request Body**:
  ```json
  {
    "serviceId": 1,
    "staffId": 1,
    "startTime": "2026-09-20T09:00:00Z",
    "customerNote": "Khách cần hoàn thành trước 10h"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": 105,
    "bookingCode": "BK-20260916-8F2C",
    "customerId": 2,
    "customerName": "Nguyễn Văn A",
    "serviceId": 1,
    "serviceName": "Cắt tóc nam tiêu chuẩn",
    "staffId": 1,
    "staffName": "Trần Văn Thợ 1",
    "startTime": "2026-09-20T09:00:00Z",
    "endTime": "2026-09-20T09:30:00Z",
    "status": "Pending",
    "customerNote": "Khách cần hoàn thành trước 10h",
    "createdAt": "2026-09-16T08:00:00Z"
  }
  ```
- **Response `409 Conflict`**: Nếu khung giờ đã bị trùng.

### 5.3. Xem danh sách booking của chính mình
- **Endpoint**: `GET /api/bookings/my-bookings`
- **Quyền hạn**: `Customer`
- **Query Params**: `status`, `page`, `pageSize`
- **Response `200 OK`**: Danh sách booking kèm phân trang.

### 5.4. [Admin] Xem toàn bộ danh sách booking hệ thống
- **Endpoint**: `GET /api/bookings`
- **Quyền hạn**: `Admin`
- **Query Params**: `status`, `staffId`, `date`, `search`, `page`, `pageSize`
- **Response `200 OK`**: Toàn bộ booking trong hệ thống kèm phân trang.

### 5.5. [Admin] Cập nhật trạng thái booking
- **Endpoint**: `PATCH /api/bookings/{id}/status`
- **Quyền hạn**: `Admin`
- **Request Body**:
  ```json
  {
    "status": "Confirmed"
  }
  ```
- **Response `200 OK`**

### 5.6. Hủy booking (Customer / Admin)
- **Endpoint**: `POST /api/bookings/{id}/cancel`
- **Quyền hạn**: `Customer` (chỉ booking của mình) hoặc `Admin`
- **Request Body**:
  ```json
  {
    "cancellationReason": "Bận việc đột xuất không thể tới đúng giờ"
  }
  ```
- **Response `200 OK`**
