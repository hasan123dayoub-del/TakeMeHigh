-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('OFFICE', 'BRANCH');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('HOTEL', 'TRANSPORT', 'RESTAURANT');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('VIP', 'STANDARD');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'OPEN', 'REGISTRATION_CLOSED', 'APPROVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegistrationDecisionType" AS ENUM ('APPROVE', 'CANCEL', 'EXTEND');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'WAITING_LIST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingEventType" AS ENUM ('CREATED', 'EDITED', 'CONFIRMED', 'WAITLISTED', 'CANCELLED', 'TRANSFERRED', 'PASSENGERS_UPDATED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('NATIONAL_ID', 'PASSPORT', 'FAMILY_BOOK', 'BIRTH_CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('AR', 'EN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(190) NOT NULL,
    "phone" VARCHAR(40),
    "full_name" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "is_platform_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "locale" "Locale" NOT NULL DEFAULT 'AR',
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offices" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "phone" VARCHAR(40),
    "whatsapp_number" VARCHAR(40),
    "email" VARCHAR(190),
    "city" VARCHAR(100),
    "country" CHAR(2) NOT NULL DEFAULT 'SY',
    "address" VARCHAR(255),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "logo_url" VARCHAR(500),
    "cover_image_url" VARCHAR(500),
    "brand_color" VARCHAR(9) NOT NULL DEFAULT '#3F70AB',
    "default_currency_code" CHAR(3) NOT NULL DEFAULT 'SYP',
    "default_locale" "Locale" NOT NULL DEFAULT 'AR',
    "public_page_enabled" BOOLEAN NOT NULL DEFAULT false,
    "booking_terms" TEXT,
    "cancellation_terms" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "city" VARCHAR(100),
    "address" VARCHAR(255),
    "phone" VARCHAR(40),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "description" VARCHAR(255),
    "scope" "RoleScope" NOT NULL DEFAULT 'BRANCH',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(60) NOT NULL,
    "group" VARCHAR(40) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "office_members" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "job_title" VARCHAR(80),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "office_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "family_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "user_agent" VARCHAR(255),
    "ip" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "code" CHAR(3) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "name_ar" VARCHAR(60) NOT NULL,
    "symbol" VARCHAR(8) NOT NULL,
    "decimals" SMALLINT NOT NULL DEFAULT 2,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "office_currencies" (
    "office_id" UUID NOT NULL,
    "currency_code" CHAR(3) NOT NULL,

    CONSTRAINT "office_currencies_pkey" PRIMARY KEY ("office_id","currency_code")
);

-- CreateTable
CREATE TABLE "tour_categories" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "name_ar" VARCHAR(80),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tour_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tours" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "category_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "destination" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "days" SMALLINT NOT NULL,
    "nights" SMALLINT NOT NULL,
    "accommodation_info" TEXT,
    "transportation_info" TEXT,
    "booking_terms" TEXT,
    "cancellation_terms" TEXT,
    "cover_image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_days" (
    "id" UUID NOT NULL,
    "tour_id" UUID NOT NULL,
    "day_number" SMALLINT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "location" VARCHAR(120),

    CONSTRAINT "tour_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_images" (
    "id" UUID NOT NULL,
    "tour_id" UUID NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "caption" VARCHAR(160),
    "sort_order" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "tour_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "tour_id" UUID NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "trip_type" "TripType" NOT NULL,
    "departure_date" DATE NOT NULL,
    "return_date" DATE NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "min_passengers" SMALLINT NOT NULL,
    "max_seats" SMALLINT NOT NULL,
    "confirmed_seats" SMALLINT NOT NULL DEFAULT 0,
    "registration_deadline" DATE NOT NULL,
    "registration_extended_until" DATE,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "cost_per_person" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "selling_price_per_person" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_supervisors" (
    "trip_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,

    CONSTRAINT "trip_supervisors_pkey" PRIMARY KEY ("trip_id","member_id")
);

-- CreateTable
CREATE TABLE "trip_registration_decisions" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "decision" "RegistrationDecisionType" NOT NULL,
    "confirmed_at_decision" SMALLINT NOT NULL,
    "min_passengers" SMALLINT NOT NULL,
    "previous_deadline" DATE NOT NULL,
    "new_deadline" DATE,
    "note" VARCHAR(500),
    "decided_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_registration_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "type" "SupplierType" NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "contact_name" VARCHAR(120),
    "phone" VARCHAR(40),
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_services" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "service_type" "SupplierType" NOT NULL,
    "description" VARCHAR(255),
    "cost_per_person" DECIMAL(14,2) NOT NULL,
    "profit_percent" DECIMAL(6,2) NOT NULL,
    "selling_price_per_person" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trip_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payments" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "trip_id" UUID,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" VARCHAR(80),
    "paid_at" TIMESTAMPTZ(3) NOT NULL,
    "notes" TEXT,
    "recorded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_offers" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(14,2) NOT NULL,
    "starts_at" DATE NOT NULL,
    "ends_at" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trip_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "full_name" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(40) NOT NULL,
    "national_id" VARCHAR(40),
    "passport_number" VARCHAR(40),
    "date_of_birth" DATE,
    "address" VARCHAR(255),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "reference" VARCHAR(20) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "passenger_count" SMALLINT NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "unit_cost" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "offer_id" UUID,
    "offer_title" VARCHAR(120),
    "discount_type" "DiscountType",
    "discount_value" DECIMAL(14,2),
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "refunded_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "confirmed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "cancellation_reason" VARCHAR(255),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_passengers" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "full_name" VARCHAR(160) NOT NULL,
    "date_of_birth" DATE,
    "nationality" VARCHAR(80),
    "document_type" "DocumentType" NOT NULL DEFAULT 'NATIONAL_ID',
    "document_number" VARCHAR(40),
    "notes" VARCHAR(500),
    "attended" BOOLEAN,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "booking_passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_events" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "type" "BookingEventType" NOT NULL,
    "from_trip_id" UUID,
    "to_trip_id" UUID,
    "data" JSONB,
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "receipt_number" VARCHAR(30) NOT NULL,
    "paid_at" TIMESTAMPTZ(3) NOT NULL,
    "notes" VARCHAR(500),
    "refunded_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "recorded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "refunded_at" TIMESTAMPTZ(3) NOT NULL,
    "recorded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_banners" (
    "id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "trip_id" UUID,
    "title" VARCHAR(120) NOT NULL,
    "subtitle" VARCHAR(200),
    "image_url" VARCHAR(500),
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "starts_at" DATE NOT NULL,
    "ends_at" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "office_id" UUID,
    "branch_id" UUID,
    "user_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" UUID,
    "summary" VARCHAR(255) NOT NULL,
    "metadata" JSONB,
    "ip" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "offices_slug_key" ON "offices"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "branches_office_id_name_key" ON "branches"("office_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "branches_office_id_id_key" ON "branches"("office_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_office_id_name_key" ON "roles"("office_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "office_members_user_id_key" ON "office_members"("user_id");

-- CreateIndex
CREATE INDEX "office_members_office_id_branch_id_idx" ON "office_members"("office_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE UNIQUE INDEX "tour_categories_office_id_name_key" ON "tour_categories"("office_id", "name");

-- CreateIndex
CREATE INDEX "tours_office_id_category_id_idx" ON "tours"("office_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "tours_office_id_slug_key" ON "tours"("office_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "tours_office_id_id_key" ON "tours"("office_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tour_days_tour_id_day_number_key" ON "tour_days"("tour_id", "day_number");

-- CreateIndex
CREATE INDEX "tour_images_tour_id_sort_order_idx" ON "tour_images"("tour_id", "sort_order");

-- CreateIndex
CREATE INDEX "trips_office_id_branch_id_departure_date_idx" ON "trips"("office_id", "branch_id", "departure_date");

-- CreateIndex
CREATE INDEX "trips_office_id_status_departure_date_idx" ON "trips"("office_id", "status", "departure_date");

-- CreateIndex
CREATE INDEX "trips_is_public_status_departure_date_idx" ON "trips"("is_public", "status", "departure_date");

-- CreateIndex
CREATE UNIQUE INDEX "trips_office_id_code_key" ON "trips"("office_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "trips_office_id_id_key" ON "trips"("office_id", "id");

-- CreateIndex
CREATE INDEX "trip_registration_decisions_trip_id_created_at_idx" ON "trip_registration_decisions"("trip_id", "created_at");

-- CreateIndex
CREATE INDEX "suppliers_office_id_type_idx" ON "suppliers"("office_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_office_id_id_key" ON "suppliers"("office_id", "id");

-- CreateIndex
CREATE INDEX "trip_services_supplier_id_idx" ON "trip_services"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_services_trip_id_service_type_key" ON "trip_services"("trip_id", "service_type");

-- CreateIndex
CREATE INDEX "supplier_payments_office_id_supplier_id_idx" ON "supplier_payments"("office_id", "supplier_id");

-- CreateIndex
CREATE INDEX "supplier_payments_trip_id_idx" ON "supplier_payments"("trip_id");

-- CreateIndex
CREATE INDEX "trip_offers_trip_id_is_active_starts_at_ends_at_idx" ON "trip_offers"("trip_id", "is_active", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "customers_office_id_full_name_idx" ON "customers"("office_id", "full_name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_office_id_phone_key" ON "customers"("office_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "customers_office_id_id_key" ON "customers"("office_id", "id");

-- CreateIndex
CREATE INDEX "bookings_office_id_branch_id_status_created_at_idx" ON "bookings"("office_id", "branch_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "bookings_trip_id_status_idx" ON "bookings"("trip_id", "status");

-- CreateIndex
CREATE INDEX "bookings_customer_id_idx" ON "bookings"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_office_id_reference_key" ON "bookings"("office_id", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_office_id_id_key" ON "bookings"("office_id", "id");

-- CreateIndex
CREATE INDEX "booking_passengers_booking_id_idx" ON "booking_passengers"("booking_id");

-- CreateIndex
CREATE INDEX "booking_events_booking_id_created_at_idx" ON "booking_events"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_office_id_branch_id_paid_at_idx" ON "payments"("office_id", "branch_id", "paid_at");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_office_id_receipt_number_key" ON "payments"("office_id", "receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "payments_office_id_id_key" ON "payments"("office_id", "id");

-- CreateIndex
CREATE INDEX "refunds_office_id_refunded_at_idx" ON "refunds"("office_id", "refunded_at");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "promo_banners_is_active_starts_at_ends_at_idx" ON "promo_banners"("is_active", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "audit_logs_office_id_created_at_idx" ON "audit_logs"("office_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_office_id_entity_type_entity_id_idx" ON "audit_logs"("office_id", "entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "offices" ADD CONSTRAINT "offices_default_currency_code_fkey" FOREIGN KEY ("default_currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_members" ADD CONSTRAINT "office_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_members" ADD CONSTRAINT "office_members_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_members" ADD CONSTRAINT "office_members_office_id_branch_id_fkey" FOREIGN KEY ("office_id", "branch_id") REFERENCES "branches"("office_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_members" ADD CONSTRAINT "office_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_currencies" ADD CONSTRAINT "office_currencies_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_currencies" ADD CONSTRAINT "office_currencies_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_categories" ADD CONSTRAINT "tour_categories_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "tour_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_days" ADD CONSTRAINT "tour_days_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_images" ADD CONSTRAINT "tour_images_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_office_id_branch_id_fkey" FOREIGN KEY ("office_id", "branch_id") REFERENCES "branches"("office_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_office_id_tour_id_fkey" FOREIGN KEY ("office_id", "tour_id") REFERENCES "tours"("office_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_supervisors" ADD CONSTRAINT "trip_supervisors_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_supervisors" ADD CONSTRAINT "trip_supervisors_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "office_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_registration_decisions" ADD CONSTRAINT "trip_registration_decisions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_registration_decisions" ADD CONSTRAINT "trip_registration_decisions_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "office_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_services" ADD CONSTRAINT "trip_services_office_id_trip_id_fkey" FOREIGN KEY ("office_id", "trip_id") REFERENCES "trips"("office_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_services" ADD CONSTRAINT "trip_services_office_id_supplier_id_fkey" FOREIGN KEY ("office_id", "supplier_id") REFERENCES "suppliers"("office_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_office_id_supplier_id_fkey" FOREIGN KEY ("office_id", "supplier_id") REFERENCES "suppliers"("office_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "office_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_offers" ADD CONSTRAINT "trip_offers_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_offers" ADD CONSTRAINT "trip_offers_office_id_trip_id_fkey" FOREIGN KEY ("office_id", "trip_id") REFERENCES "trips"("office_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_office_id_branch_id_fkey" FOREIGN KEY ("office_id", "branch_id") REFERENCES "branches"("office_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_office_id_trip_id_fkey" FOREIGN KEY ("office_id", "trip_id") REFERENCES "trips"("office_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_office_id_customer_id_fkey" FOREIGN KEY ("office_id", "customer_id") REFERENCES "customers"("office_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "trip_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "office_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_passengers" ADD CONSTRAINT "booking_passengers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_to_trip_id_fkey" FOREIGN KEY ("to_trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "office_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_office_id_branch_id_fkey" FOREIGN KEY ("office_id", "branch_id") REFERENCES "branches"("office_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_office_id_booking_id_fkey" FOREIGN KEY ("office_id", "booking_id") REFERENCES "bookings"("office_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "office_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_office_id_payment_id_fkey" FOREIGN KEY ("office_id", "payment_id") REFERENCES "payments"("office_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_office_id_booking_id_fkey" FOREIGN KEY ("office_id", "booking_id") REFERENCES "bookings"("office_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "office_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_banners" ADD CONSTRAINT "promo_banners_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_banners" ADD CONSTRAINT "promo_banners_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- Business guards enforced by PostgreSQL itself (second line of defence
-- behind the services). Prisma does not model CHECK constraints, so they
-- live here and are documented in docs/database/README.md.
-- =====================================================================

-- Seats: only CONFIRMED bookings consume seats; never above capacity.
ALTER TABLE "trips" ADD CONSTRAINT "chk_trips_seats" CHECK ("confirmed_seats" >= 0 AND "confirmed_seats" <= "max_seats");
ALTER TABLE "trips" ADD CONSTRAINT "chk_trips_capacity" CHECK ("max_seats" > 0 AND "min_passengers" >= 1 AND "min_passengers" <= "max_seats");
ALTER TABLE "trips" ADD CONSTRAINT "chk_trips_dates" CHECK ("return_date" >= "departure_date" AND "registration_deadline" <= "departure_date");
ALTER TABLE "trips" ADD CONSTRAINT "chk_trips_prices" CHECK ("cost_per_person" >= 0 AND "selling_price_per_person" >= 0);

-- Pricing: selling = cost x (1 + profit%), so it can never be below cost.
ALTER TABLE "trip_services" ADD CONSTRAINT "chk_trip_services_pricing" CHECK ("cost_per_person" >= 0 AND "profit_percent" >= 0 AND "profit_percent" <= 1000 AND "selling_price_per_person" >= "cost_per_person");

-- Offers: positive, percentage at most 100, valid period.
ALTER TABLE "trip_offers" ADD CONSTRAINT "chk_trip_offers_value" CHECK ("discount_value" > 0 AND ("discount_type" <> 'PERCENTAGE' OR "discount_value" <= 100));
ALTER TABLE "trip_offers" ADD CONSTRAINT "chk_trip_offers_period" CHECK ("ends_at" >= "starts_at");

-- Bookings: at least one passenger, discount never above the subtotal, no negative money.
ALTER TABLE "bookings" ADD CONSTRAINT "chk_bookings_passengers" CHECK ("passenger_count" >= 1);
ALTER TABLE "bookings" ADD CONSTRAINT "chk_bookings_amounts" CHECK ("discount_amount" >= 0 AND "discount_amount" <= "subtotal" AND "total_amount" >= 0 AND "paid_amount" >= 0 AND "refunded_amount" >= 0);

-- Payments & refunds: positive; a payment can never be refunded above its amount.
ALTER TABLE "payments" ADD CONSTRAINT "chk_payments_amount" CHECK ("amount" > 0 AND "refunded_amount" >= 0 AND "refunded_amount" <= "amount");
ALTER TABLE "refunds" ADD CONSTRAINT "chk_refunds_amount" CHECK ("amount" > 0);
ALTER TABLE "supplier_payments" ADD CONSTRAINT "chk_supplier_payments_amount" CHECK ("amount" > 0);

-- Tours and banners.
ALTER TABLE "tours" ADD CONSTRAINT "chk_tours_duration" CHECK ("days" >= 1 AND "nights" >= 0 AND "nights" <= "days");
ALTER TABLE "promo_banners" ADD CONSTRAINT "chk_promo_banners_period" CHECK ("ends_at" >= "starts_at");
