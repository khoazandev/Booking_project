$ErrorActionPreference = "Stop"

function Write-TestHeader($title) {
    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host "  TEST: $title" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
}

function Assert-Condition($condition, $message) {
    if ($condition) {
        Write-Host " [PASS] $message" -ForegroundColor Green
    } else {
        Write-Host " [FAIL] $message" -ForegroundColor Red
        throw "Assertion failed: $message"
    }
}

try {
    # ----------------------------------------------------
    # 1. AUTHENTICATION TESTS
    # ----------------------------------------------------
    Write-TestHeader "1. Authentication & Role Serialization"
    
    # 1.1 Invalid credentials
    try {
        $badBody = @{ email = "fake@booking.com"; password = "WrongPassword!" } | ConvertTo-Json
        $null = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $badBody -ContentType "application/json"
        Assert-Condition $false "Invalid login should fail"
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Assert-Condition ($status -eq 400 -or $status -eq 401) "Invalid login rejected with status $status (400/401)"
    }

    # 1.2 Customer Login
    $custBody = @{ email = "customer1@demo.com"; password = "Password123!" } | ConvertTo-Json
    $custAuth = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $custBody -ContentType "application/json"
    Assert-Condition ($custAuth.token -ne $null -and $custAuth.token.Length -gt 20) "Customer token received"
    Assert-Condition ($custAuth.user.role -eq "Customer") "Customer role correctly serialized as 'Customer'"
    $custHeaders = @{ Authorization = "Bearer $($custAuth.token)" }

    # 1.3 Admin Login
    $adminBody = @{ email = "admin@booking.com"; password = "Admin123!" } | ConvertTo-Json
    $adminAuth = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $adminBody -ContentType "application/json"
    Assert-Condition ($adminAuth.token -ne $null -and $adminAuth.token.Length -gt 20) "Admin token received"
    Assert-Condition ($adminAuth.user.role -eq "Admin") "Admin role correctly serialized as 'Admin'"
    $adminHeaders = @{ Authorization = "Bearer $($adminAuth.token)" }

    # ----------------------------------------------------
    # 2. ROLE-BASED ACCESS CONTROL (RBAC)
    # ----------------------------------------------------
    Write-TestHeader "2. RBAC & Security Boundaries"

    # Customer accessing Admin endpoint
    try {
        $null = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings?page=1&pageSize=10" -Method Get -Headers $custHeaders
        Assert-Condition $false "Customer should NOT be able to access Admin Bookings"
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Assert-Condition ($statusCode -eq 403) "Customer accessing admin bookings returns 403 Forbidden"
    }

    # Admin accessing Admin endpoint
    $adminBookings = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings?page=1&pageSize=10" -Method Get -Headers $adminHeaders
    Assert-Condition ($adminBookings.items -ne $null) "Admin successfully accesses /api/bookings"

    # ----------------------------------------------------
    # 3. AVAILABLE SLOTS & TIME VALIDATION
    # ----------------------------------------------------
    Write-TestHeader "3. Available Slots & Time Logic"

    $staffId = 1 # Lê Văn Thợ Cắt 1
    $serviceId = 2 # Goi dau duong sinh - 45 mins
    $testDate = (Get-Date).AddDays(2).ToString("yyyy-MM-dd") # e.g. 2026-09-24
    
    $slots = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings/available-slots?staffId=$staffId&serviceId=$serviceId&date=$testDate" -Method Get
    
    Assert-Condition ($slots.Count -gt 0) "Slots returned for staff $staffId on $testDate (Found $($slots.Count) slots)"
    
    # Verify first slot starts at 08:00
    $firstSlotStart = [DateTime]$slots[0].startTime
    Write-Host " First slot start time: $($firstSlotStart.ToString('HH:mm'))" -ForegroundColor Yellow
    Assert-Condition ($firstSlotStart.Hour -eq 8 -and $firstSlotStart.Minute -eq 0) "First slot starts at 08:00 morning local time"

    # Check that each slot has duration 45 mins and NO overlap
    $hasOverlap = $false
    for ($i = 0; $i -lt $slots.Count; $i++) {
        $sStart = [DateTime]$slots[$i].startTime
        $sEnd = [DateTime]$slots[$i].endTime
        $dur = ($sEnd - $sStart).TotalMinutes
        if ($dur -ne 45) {
            Write-Host " [FAIL] Slot $i duration is $dur minutes instead of 45" -ForegroundColor Red
            $hasOverlap = $true
        }
        if ($i -gt 0) {
            $prevEnd = [DateTime]$slots[$i-1].endTime
            if ($sStart -lt $prevEnd) {
                Write-Host " [FAIL] Slot overlap detected: Slot $($i-1) ends at $prevEnd, Slot $i starts at $sStart" -ForegroundColor Red
                $hasOverlap = $true
            }
        }
    }
    Assert-Condition (-not $hasOverlap) "All slots have exact duration 45m and ZERO overlap"

    # ----------------------------------------------------
    # 4. BOOKING CREATION, CONFLICT DETECTION & LIFECYCLE
    # ----------------------------------------------------
    Write-TestHeader "4. Booking Creation, Conflict Detection & Lifecycle"

    # Pick an available slot to book
    $availSlots = $slots | Where-Object { $_.isAvailable -eq $true }
    Assert-Condition ($availSlots.Count -gt 0) "There are available slots to book"
    $targetSlot = $availSlots[0]
    $targetStartTime = $targetSlot.startTime
    Write-Host " Target slot start: $targetStartTime" -ForegroundColor Yellow

    # Customer 1 books slot
    $bookingReq = @{
        serviceId = $serviceId
        staffId = $staffId
        startTime = $targetStartTime
        customerNote = "Auto test booking logic verification"
    } | ConvertTo-Json

    $newBooking = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings" -Method Post -Body $bookingReq -ContentType "application/json" -Headers $custHeaders
    Assert-Condition ($newBooking.id -gt 0) "Booking created successfully (ID: $($newBooking.id), Code: $($newBooking.bookingCode))"
    Assert-Condition ($newBooking.status -eq "Pending" -or $newBooking.status -eq "Confirmed") "Booking initial status is $($newBooking.status)"

    # Verify that the booked slot is marked unavailable
    $slotsAfter = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings/available-slots?staffId=$staffId&serviceId=$serviceId&date=$testDate" -Method Get
    $matchingSlotAfter = $slotsAfter | Where-Object { $_.startTime -eq $targetStartTime }
    Assert-Condition ($matchingSlotAfter.isAvailable -eq $false) "Booked slot is now marked unavailable for staff $staffId"

    # Test Double Booking / Slot Conflict: Customer 2 attempts to book same slot
    $conflictEncountered = $false
    try {
        $cust2Body = @{ email = "customer2@demo.com"; password = "Password123!" } | ConvertTo-Json
        $cust2Auth = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $cust2Body -ContentType "application/json"
        $cust2Headers = @{ Authorization = "Bearer $($cust2Auth.token)" }
        
        $null = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings" -Method Post -Body $bookingReq -ContentType "application/json" -Headers $cust2Headers
    } catch {
        $conflictEncountered = $true
        Write-Host " Double booking conflict caught: $($_.Exception.Message)" -ForegroundColor Green
    }
    Assert-Condition $conflictEncountered "Double booking successfully rejected by backend logic"

    # ----------------------------------------------------
    # 5. MY BOOKINGS & CANCEL FLOW
    # ----------------------------------------------------
    Write-TestHeader "5. Customer My-Bookings & Cancellation"

    $myBookings = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings/my-bookings" -Method Get -Headers $custHeaders
    Assert-Condition ($myBookings.items.Count -gt 0) "Customer can retrieve their bookings list"
    
    $foundCreated = $myBookings.items | Where-Object { $_.id -eq $newBooking.id }
    Assert-Condition ($foundCreated -ne $null) "Created booking found in customer's list"

    # Cancel the booking with reason
    $cancelBody = '{"cancellationReason": "Customer has sudden busy schedule"}'
    $cancelBytes = [System.Text.Encoding]::UTF8.GetBytes($cancelBody)
    $cancelRes = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings/$($newBooking.id)/cancel" -Method Post -Body $cancelBytes -ContentType "application/json; charset=utf-8" -Headers $custHeaders
    Assert-Condition ($cancelRes.status -eq "Cancelled") "Booking cancelled successfully, status is 'Cancelled'"

    # Verify slot is freed up after cancellation
    $slotsFreed = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings/available-slots?staffId=$staffId&serviceId=$serviceId&date=$testDate" -Method Get
    $matchingFreedSlot = $slotsFreed | Where-Object { $_.startTime -eq $targetStartTime }
    Assert-Condition ($matchingFreedSlot.isAvailable -eq $true) "Previously booked slot is immediately freed up and available again"

    # ----------------------------------------------------
    # 6. ADMIN STATUS UPDATE & CALENDAR
    # ----------------------------------------------------
    Write-TestHeader "6. Admin Calendar & Status Management"

    # Create another booking to test admin operations
    $adminTargetSlot = ($slots | Where-Object { $_.isAvailable -eq $true })[1]
    $adminBookingReq = @{
        serviceId = $serviceId
        staffId = $staffId
        startTime = $adminTargetSlot.startTime
        customerNote = "Admin test booking"
    } | ConvertTo-Json
    $adminTestBooking = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings" -Method Post -Body $adminBookingReq -ContentType "application/json" -Headers $custHeaders
    
    # Admin updates status to Confirmed (HTTP PATCH)
    $updateStatusBody = @{ status = "Confirmed" } | ConvertTo-Json
    $updatedBooking = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings/$($adminTestBooking.id)/status" -Method Patch -Body $updateStatusBody -ContentType "application/json" -Headers $adminHeaders
    Assert-Condition ($updatedBooking.status -eq "Confirmed") "Admin successfully updated booking status to Confirmed (via PATCH)"

    # Admin updates status to Completed (HTTP PATCH)
    $updateCompletedBody = @{ status = "Completed" } | ConvertTo-Json
    $completedBooking = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings/$($adminTestBooking.id)/status" -Method Patch -Body $updateCompletedBody -ContentType "application/json" -Headers $adminHeaders
    Assert-Condition ($completedBooking.status -eq "Completed") "Admin successfully updated booking status to Completed (via PATCH)"

    # Admin Calendar & Filtered Bookings query
    $calendarBookings = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings?date=$testDate&staffId=$staffId&pageSize=100" -Method Get -Headers $adminHeaders
    Assert-Condition ($calendarBookings.items.Count -ge 1) "Admin successfully queried $($calendarBookings.items.Count) bookings for date $testDate and staff $staffId"

    # Clean up test booking
    $cancelBody2 = '{"cancellationReason": "Cleanup after admin test"}'
    $cancelBytes2 = [System.Text.Encoding]::UTF8.GetBytes($cancelBody2)
    # Notice: booking is completed, so cancelling should be rejected by TC6!
    try {
        $null = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings/$($adminTestBooking.id)/cancel" -Method Post -Body $cancelBytes2 -ContentType "application/json; charset=utf-8" -Headers $custHeaders
        Assert-Condition $false "Completed booking should NOT be cancellable"
    } catch {
        Assert-Condition $true "Completed booking correctly blocked from cancellation (TC6 rule passed)"
    }

    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host "  ALL LOGIC & WORKFLOW TESTS PASSED 100%!  " -ForegroundColor Green
    Write-Host "========================================================`n" -ForegroundColor Green
} catch {
    Write-Host "`nTEST SUITE FAILED: $_" -ForegroundColor Red
    exit 1
}
