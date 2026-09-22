CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
    "ProductVersion" TEXT NOT NULL
);

BEGIN TRANSACTION;

CREATE TABLE "Services" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Services" PRIMARY KEY AUTOINCREMENT,
    "Name" TEXT NOT NULL,
    "Description" TEXT NULL,
    "DurationMinutes" INTEGER NOT NULL,
    "Price" TEXT NOT NULL,
    "IsActive" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL
);

CREATE TABLE "Staffs" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Staffs" PRIMARY KEY AUTOINCREMENT,
    "FullName" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "IsActive" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL
);

CREATE TABLE "Users" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Users" PRIMARY KEY AUTOINCREMENT,
    "Email" TEXT NOT NULL,
    "PasswordHash" TEXT NOT NULL,
    "FullName" TEXT NOT NULL,
    "Role" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL
);

CREATE TABLE "WorkSchedules" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_WorkSchedules" PRIMARY KEY AUTOINCREMENT,
    "StaffId" INTEGER NOT NULL,
    "WorkDate" TEXT NOT NULL,
    "StartTime" TEXT NOT NULL,
    "EndTime" TEXT NOT NULL,
    CONSTRAINT "FK_WorkSchedules_Staffs_StaffId" FOREIGN KEY ("StaffId") REFERENCES "Staffs" ("Id") ON DELETE CASCADE
);

CREATE TABLE "Bookings" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Bookings" PRIMARY KEY AUTOINCREMENT,
    "BookingCode" TEXT NOT NULL,
    "CustomerId" INTEGER NOT NULL,
    "ServiceId" INTEGER NOT NULL,
    "StaffId" INTEGER NOT NULL,
    "StartTime" TEXT NOT NULL,
    "EndTime" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "CustomerNote" TEXT NULL,
    "CancellationReason" TEXT NULL,
    "CreatedAt" TEXT NOT NULL,
    CONSTRAINT "FK_Bookings_Services_ServiceId" FOREIGN KEY ("ServiceId") REFERENCES "Services" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Bookings_Staffs_StaffId" FOREIGN KEY ("StaffId") REFERENCES "Staffs" ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_Bookings_Users_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Users" ("Id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX "IX_Bookings_BookingCode" ON "Bookings" ("BookingCode");

CREATE INDEX "IX_Bookings_ConflictCheck" ON "Bookings" ("StaffId", "Status", "StartTime", "EndTime");

CREATE INDEX "IX_Bookings_CustomerId" ON "Bookings" ("CustomerId");

CREATE INDEX "IX_Bookings_ServiceId" ON "Bookings" ("ServiceId");

CREATE UNIQUE INDEX "IX_Staffs_Email" ON "Staffs" ("Email");

CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");

CREATE INDEX "IX_WorkSchedules_StaffId_WorkDate" ON "WorkSchedules" ("StaffId", "WorkDate");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260921155215_InitialCreate', '8.0.8');

COMMIT;

