-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('ALL', 'BRANCH', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "CityKind" AS ENUM ('GOVERNORATE', 'CITY', 'TOURIST_SPOT');

-- CreateEnum
CREATE TYPE "ServiceKind" AS ENUM ('HOTEL', 'TRANSPORT', 'RESTAURANT', 'OTHER');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('LAND', 'SEA', 'AIR');

-- CreateEnum
CREATE TYPE "ItemSource" AS ENUM ('INTEGRATION', 'MANUAL');

-- CreateEnum
CREATE TYPE "ProfitMode" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('NOT_CONFIGURED', 'ACTIVE', 'ERROR', 'DISABLED');

-- CreateEnum
CREATE TYPE "SyncResult" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncTrigger" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "TravelScope" AS ENUM ('DOMESTIC', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClosureReason" AS ENUM ('DEADLINE', 'MANUAL');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('CONFIRM', 'EXTEND', 'CANCEL', 'REOPEN');

-- CreateEnum
CREATE TYPE "OfferKind" AS ENUM ('BUNDLE', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SYRIAN_ID', 'PASSPORT', 'VISA', 'RESIDENCE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'WAITLIST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingEventType" AS ENUM ('CREATED', 'CONFIRMED', 'WAITLISTED', 'PROMOTED', 'CANCELLED', 'TRANSFERRED', 'PASSENGERS_UPDATED', 'PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "Attendance" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "VisaStatus" AS ENUM ('NOT_STARTED', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('PARTIAL', 'FULL', 'REFUND');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SlideLink" AS ENUM ('NONE', 'TRIP', 'PROGRAM', 'OFFER');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name_ar" VARCHAR(60) NOT NULL,
    "name_en" VARCHAR(60) NOT NULL,
    "description" VARCHAR(255),
    "scope" "RoleScope" NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "module" VARCHAR(40) NOT NULL,
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
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "branch_id" UUID,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(190) NOT NULL,
    "phone" VARCHAR(40),
    "password_hash" VARCHAR(255) NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "failed_login_count" SMALLINT NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_profiles" (
    "user_id" UUID NOT NULL,
    "languages" VARCHAR(200),
    "license_no" VARCHAR(60),
    "bio" VARCHAR(1000),

    CONSTRAINT "guide_profiles_pkey" PRIMARY KEY ("user_id")
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
CREATE TABLE "countries" (
    "id" UUID NOT NULL,
    "iso_code" CHAR(2) NOT NULL,
    "name_ar" VARCHAR(80) NOT NULL,
    "name_en" VARCHAR(80) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "name_ar" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "kind" "CityKind" NOT NULL DEFAULT 'CITY',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "code" CHAR(3) NOT NULL,
    "name_ar" VARCHAR(60) NOT NULL,
    "name_en" VARCHAR(60) NOT NULL,
    "symbol" VARCHAR(8) NOT NULL,
    "decimals" SMALLINT NOT NULL DEFAULT 2,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "trip_categories" (
    "id" UUID NOT NULL,
    "name_ar" VARCHAR(80) NOT NULL,
    "name_en" VARCHAR(80) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trip_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "address" VARCHAR(255),
    "phone" VARCHAR(40),
    "whatsapp" VARCHAR(40),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "working_hours" VARCHAR(120),
    "show_on_landing" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "kind" "ServiceKind" NOT NULL,
    "name_ar" VARCHAR(80) NOT NULL,
    "name_en" VARCHAR(80) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "city_id" UUID,
    "name" VARCHAR(150) NOT NULL,
    "transport_mode" "TransportMode",
    "contact_name" VARCHAR(120),
    "phone" VARCHAR(40),
    "email" VARCHAR(190),
    "address" VARCHAR(255),
    "description" VARCHAR(1000),
    "rating" SMALLINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_items" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "from_city_id" UUID,
    "to_city_id" UUID,
    "cost_per_person" DECIMAL(14,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "source" "ItemSource" NOT NULL DEFAULT 'MANUAL',
    "external_ref" VARCHAR(120),
    "last_synced_at" TIMESTAMPTZ(3),
    "is_stale" BOOLEAN NOT NULL DEFAULT false,
    "available" BOOLEAN,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_rules" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "company_id" UUID,
    "mode" "ProfitMode" NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profit_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "adapter_key" VARCHAR(60) NOT NULL,
    "base_url" VARCHAR(300) NOT NULL,
    "credentials_encrypted" TEXT,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "sync_interval_hours" SMALLINT NOT NULL DEFAULT 6,
    "last_sync_at" TIMESTAMPTZ(3),
    "last_success_at" TIMESTAMPTZ(3),
    "last_error" VARCHAR(500),
    "consecutive_failures" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_logs" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "trigger" "SyncTrigger" NOT NULL,
    "result" "SyncResult" NOT NULL,
    "items_updated" INTEGER NOT NULL DEFAULT 0,
    "items_created" INTEGER NOT NULL DEFAULT 0,
    "cost_changes" INTEGER NOT NULL DEFAULT 0,
    "error" VARCHAR(1000),
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "finished_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "integration_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "category_id" UUID NOT NULL,
    "branch_id" UUID,
    "origin_city_id" UUID NOT NULL,
    "destination_city_id" UUID NOT NULL,
    "scope" "TravelScope" NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "registration_deadline" TIMESTAMPTZ(3) NOT NULL,
    "min_passengers" SMALLINT NOT NULL,
    "max_passengers" SMALLINT NOT NULL,
    "confirmed_seats" SMALLINT NOT NULL DEFAULT 0,
    "currency_code" CHAR(3) NOT NULL,
    "cost_per_person" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "price_per_person" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "cost_changed_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),
    "closure_reason" "ClosureReason",
    "final_passenger_count" SMALLINT,
    "cancel_reason" VARCHAR(255),
    "cover_image_url" VARCHAR(500),
    "terms" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_service_lines" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "company_item_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "transport_mode" "TransportMode",
    "sequence_no" SMALLINT NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "from_city_id" UUID,
    "to_city_id" UUID,
    "unit_cost" DECIMAL(14,2) NOT NULL,
    "quantity" SMALLINT NOT NULL DEFAULT 1,
    "cost_snapshot" DECIMAL(14,2) NOT NULL,
    "profit_mode" "ProfitMode" NOT NULL,
    "profit_value" DECIMAL(14,2) NOT NULL,
    "selling_price" DECIMAL(14,2) NOT NULL,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trip_service_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_pickup_points" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "pickup_time" VARCHAR(5),
    "surcharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" VARCHAR(255),

    CONSTRAINT "trip_pickup_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_guides" (
    "trip_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "trip_guides_pkey" PRIMARY KEY ("trip_id","user_id")
);

-- CreateTable
CREATE TABLE "trip_images" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "caption" VARCHAR(160),
    "sort_order" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "trip_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "category_id" UUID NOT NULL,
    "branch_id" UUID,
    "scope" "TravelScope" NOT NULL,
    "registration_deadline" TIMESTAMPTZ(3) NOT NULL,
    "min_passengers" SMALLINT NOT NULL,
    "max_passengers" SMALLINT NOT NULL,
    "confirmed_seats" SMALLINT NOT NULL DEFAULT 0,
    "currency_code" CHAR(3) NOT NULL,
    "cost_per_person" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "price_per_person" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "closed_at" TIMESTAMPTZ(3),
    "closure_reason" "ClosureReason",
    "final_passenger_count" SMALLINT,
    "cancel_reason" VARCHAR(255),
    "cover_image_url" VARCHAR(500),
    "terms" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_trips" (
    "program_id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "sequence_no" SMALLINT NOT NULL,

    CONSTRAINT "program_trips_pkey" PRIMARY KEY ("program_id","trip_id")
);

-- CreateTable
CREATE TABLE "registration_decisions" (
    "id" UUID NOT NULL,
    "trip_id" UUID,
    "program_id" UUID,
    "decision" "DecisionType" NOT NULL,
    "passengers_at_time" SMALLINT NOT NULL,
    "previous_deadline" TIMESTAMPTZ(3) NOT NULL,
    "new_deadline" TIMESTAMPTZ(3),
    "note" VARCHAR(500),
    "decided_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "kind" "OfferKind" NOT NULL,
    "discount_mode" "ProfitMode" NOT NULL,
    "discount_value" DECIMAL(14,2) NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE NOT NULL,
    "max_seats" SMALLINT,
    "confirmed_seats" SMALLINT NOT NULL DEFAULT 0,
    "currency_code" CHAR(3),
    "cost_per_person" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "price_per_person" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "cover_image_url" VARCHAR(500),
    "terms" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_service_lines" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "company_item_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "sequence_no" SMALLINT NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,2) NOT NULL,
    "quantity" SMALLINT NOT NULL DEFAULT 1,
    "cost_snapshot" DECIMAL(14,2) NOT NULL,
    "profit_mode" "ProfitMode" NOT NULL,
    "profit_value" DECIMAL(14,2) NOT NULL,
    "selling_price" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "offer_service_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_targets" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "trip_id" UUID,
    "program_id" UUID,

    CONSTRAINT "offer_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(40) NOT NULL,
    "nationality_country_id" UUID NOT NULL,
    "birth_date" DATE,
    "gender" "Gender",
    "notes" VARCHAR(1000),
    "branch_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_documents" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "doc_type" "DocumentType" NOT NULL,
    "doc_number" VARCHAR(60) NOT NULL,
    "issuing_country_id" UUID NOT NULL,
    "issued_on" DATE,
    "expires_on" DATE,
    "file_path" VARCHAR(300),
    "file_mime" VARCHAR(60),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "booking_no" VARCHAR(20) NOT NULL,
    "trip_id" UUID,
    "program_id" UUID,
    "offer_id" UUID,
    "payer_customer_id" UUID NOT NULL,
    "pickup_point_id" UUID,
    "branch_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "passenger_count" SMALLINT NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "price_per_person" DECIMAL(14,2) NOT NULL,
    "cost_per_person" DECIMAL(14,2) NOT NULL,
    "surcharge_per_person" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_offer_id" UUID,
    "discount_title" VARCHAR(160),
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "refunded_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" VARCHAR(1000),
    "confirmed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "cancel_reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_passengers" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "document_id" UUID,
    "seat_label" VARCHAR(10),
    "attendance" "Attendance",
    "guide_note" VARCHAR(500),
    "sort_order" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "booking_passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_events" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "type" "BookingEventType" NOT NULL,
    "data" JSONB,
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visa_applications" (
    "id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "status" "VisaStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "visa_number" VARCHAR(60),
    "submitted_at" TIMESTAMPTZ(3),
    "decided_at" TIMESTAMPTZ(3),
    "expires_on" DATE,
    "fee" DECIMAL(14,2),
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "visa_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "receipt_no" VARCHAR(20) NOT NULL,
    "booking_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "refund_of_id" UUID,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "payer_name" VARCHAR(160) NOT NULL,
    "paid_at" TIMESTAMPTZ(3) NOT NULL,
    "balance_after" DECIMAL(14,2) NOT NULL,
    "reason" VARCHAR(255),
    "notes" VARCHAR(500),
    "idempotency_key" VARCHAR(80),
    "received_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "number_sequences" (
    "key" VARCHAR(20) NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "number_sequences_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "custom_trip_requests" (
    "id" UUID NOT NULL,
    "request_no" VARCHAR(20) NOT NULL,
    "contact_name" VARCHAR(120) NOT NULL,
    "contact_phone" VARCHAR(40) NOT NULL,
    "passengers_count" SMALLINT NOT NULL,
    "desired_from" DATE NOT NULL,
    "desired_to" DATE NOT NULL,
    "origin_city_id" UUID NOT NULL,
    "destination_city_id" UUID NOT NULL,
    "category_id" UUID,
    "message" VARCHAR(1000),
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "assigned_branch_id" UUID,
    "handled_by_id" UUID,
    "converted_booking_id" UUID,
    "staff_notes" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "custom_trip_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_trip_request_items" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "company_id" UUID,
    "other_text" VARCHAR(200),
    "transport_mode" "TransportMode",

    CONSTRAINT "custom_trip_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_slides" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "subtitle" VARCHAR(255),
    "image_url" VARCHAR(500) NOT NULL,
    "link_type" "SlideLink" NOT NULL DEFAULT 'NONE',
    "trip_id" UUID,
    "program_id" UUID,
    "offer_id" UUID,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "landing_slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "achieved_on" DATE,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_images" (
    "id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "caption" VARCHAR(160),
    "sort_order" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "achievement_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" TEXT NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "office_name" VARCHAR(150) NOT NULL,
    "office_name_en" VARCHAR(150),
    "tagline" VARCHAR(255),
    "about" TEXT,
    "logo_url" VARCHAR(500),
    "hero_image_url" VARCHAR(500),
    "whatsapp_number" VARCHAR(40) NOT NULL,
    "whatsapp_template" VARCHAR(500) NOT NULL,
    "phone" VARCHAR(40),
    "email" VARCHAR(190),
    "address" VARCHAR(255),
    "default_currency_code" CHAR(3) NOT NULL DEFAULT 'SYP',
    "social_links" JSONB,
    "visa_warning_days" SMALLINT NOT NULL DEFAULT 14,
    "passport_validity_months" SMALLINT NOT NULL DEFAULT 6,
    "deadline_warning_days" SMALLINT NOT NULL DEFAULT 3,
    "confirm_requires_payment" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "branch_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" UUID,
    "summary" VARCHAR(255) NOT NULL,
    "changes" JSONB,
    "ip" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_branch_id_idx" ON "users"("branch_id");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso_code_key" ON "countries"("iso_code");

-- CreateIndex
CREATE INDEX "cities_country_id_is_active_idx" ON "cities"("country_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "cities_country_id_name_ar_key" ON "cities"("country_id", "name_ar");

-- CreateIndex
CREATE UNIQUE INDEX "trip_categories_name_ar_key" ON "trip_categories"("name_ar");

-- CreateIndex
CREATE UNIQUE INDEX "branches_name_key" ON "branches"("name");

-- CreateIndex
CREATE UNIQUE INDEX "services_code_key" ON "services"("code");

-- CreateIndex
CREATE INDEX "companies_service_id_transport_mode_is_active_idx" ON "companies"("service_id", "transport_mode", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "companies_service_id_name_key" ON "companies"("service_id", "name");

-- CreateIndex
CREATE INDEX "company_items_company_id_is_active_idx" ON "company_items"("company_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "company_items_company_id_external_ref_key" ON "company_items"("company_id", "external_ref");

-- CreateIndex
CREATE UNIQUE INDEX "profit_rules_service_id_company_id_key" ON "profit_rules"("service_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_company_id_key" ON "integration_connections"("company_id");

-- CreateIndex
CREATE INDEX "integration_sync_logs_connection_id_started_at_idx" ON "integration_sync_logs"("connection_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "trips_code_key" ON "trips"("code");

-- CreateIndex
CREATE INDEX "trips_status_starts_at_idx" ON "trips"("status", "starts_at");

-- CreateIndex
CREATE INDEX "trips_branch_id_starts_at_idx" ON "trips"("branch_id", "starts_at");

-- CreateIndex
CREATE INDEX "trips_is_public_status_starts_at_idx" ON "trips"("is_public", "status", "starts_at");

-- CreateIndex
CREATE INDEX "trip_service_lines_company_item_id_idx" ON "trip_service_lines"("company_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_service_lines_trip_id_sequence_no_key" ON "trip_service_lines"("trip_id", "sequence_no");

-- CreateIndex
CREATE UNIQUE INDEX "trip_pickup_points_trip_id_city_id_key" ON "trip_pickup_points"("trip_id", "city_id");

-- CreateIndex
CREATE INDEX "trip_guides_user_id_idx" ON "trip_guides"("user_id");

-- CreateIndex
CREATE INDEX "trip_images_trip_id_sort_order_idx" ON "trip_images"("trip_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "programs_code_key" ON "programs"("code");

-- CreateIndex
CREATE INDEX "programs_status_registration_deadline_idx" ON "programs"("status", "registration_deadline");

-- CreateIndex
CREATE INDEX "programs_is_public_status_idx" ON "programs"("is_public", "status");

-- CreateIndex
CREATE INDEX "program_trips_trip_id_idx" ON "program_trips"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "program_trips_program_id_sequence_no_key" ON "program_trips"("program_id", "sequence_no");

-- CreateIndex
CREATE INDEX "registration_decisions_trip_id_idx" ON "registration_decisions"("trip_id");

-- CreateIndex
CREATE INDEX "registration_decisions_program_id_idx" ON "registration_decisions"("program_id");

-- CreateIndex
CREATE INDEX "offers_is_active_valid_from_valid_to_idx" ON "offers"("is_active", "valid_from", "valid_to");

-- CreateIndex
CREATE INDEX "offer_service_lines_offer_id_idx" ON "offer_service_lines"("offer_id");

-- CreateIndex
CREATE INDEX "offer_targets_trip_id_idx" ON "offer_targets"("trip_id");

-- CreateIndex
CREATE INDEX "offer_targets_program_id_idx" ON "offer_targets"("program_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_targets_offer_id_trip_id_key" ON "offer_targets"("offer_id", "trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_targets_offer_id_program_id_key" ON "offer_targets"("offer_id", "program_id");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_full_name_idx" ON "customers"("full_name");

-- CreateIndex
CREATE INDEX "customers_branch_id_idx" ON "customers"("branch_id");

-- CreateIndex
CREATE INDEX "customer_documents_customer_id_idx" ON "customer_documents"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_documents_doc_type_doc_number_issuing_country_id_key" ON "customer_documents"("doc_type", "doc_number", "issuing_country_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_no_key" ON "bookings"("booking_no");

-- CreateIndex
CREATE INDEX "bookings_trip_id_status_idx" ON "bookings"("trip_id", "status");

-- CreateIndex
CREATE INDEX "bookings_program_id_status_idx" ON "bookings"("program_id", "status");

-- CreateIndex
CREATE INDEX "bookings_offer_id_status_idx" ON "bookings"("offer_id", "status");

-- CreateIndex
CREATE INDEX "bookings_branch_id_status_created_at_idx" ON "bookings"("branch_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "bookings_payer_customer_id_idx" ON "bookings"("payer_customer_id");

-- CreateIndex
CREATE INDEX "booking_passengers_customer_id_idx" ON "booking_passengers"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_passengers_booking_id_customer_id_key" ON "booking_passengers"("booking_id", "customer_id");

-- CreateIndex
CREATE INDEX "booking_events_booking_id_created_at_idx" ON "booking_events"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "visa_applications_status_idx" ON "visa_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "visa_applications_passenger_id_country_id_key" ON "visa_applications"("passenger_id", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_no_key" ON "payments"("receipt_no");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_branch_id_paid_at_idx" ON "payments"("branch_id", "paid_at");

-- CreateIndex
CREATE INDEX "payments_refund_of_id_idx" ON "payments"("refund_of_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_trip_requests_request_no_key" ON "custom_trip_requests"("request_no");

-- CreateIndex
CREATE UNIQUE INDEX "custom_trip_requests_converted_booking_id_key" ON "custom_trip_requests"("converted_booking_id");

-- CreateIndex
CREATE INDEX "custom_trip_requests_status_created_at_idx" ON "custom_trip_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "custom_trip_requests_assigned_branch_id_status_idx" ON "custom_trip_requests"("assigned_branch_id", "status");

-- CreateIndex
CREATE INDEX "custom_trip_request_items_request_id_idx" ON "custom_trip_request_items"("request_id");

-- CreateIndex
CREATE INDEX "landing_slides_is_active_sort_order_idx" ON "landing_slides"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "achievement_images_achievement_id_sort_order_idx" ON "achievement_images"("achievement_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "policies_slug_key" ON "policies"("slug");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_profiles" ADD CONSTRAINT "guide_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_items" ADD CONSTRAINT "company_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_items" ADD CONSTRAINT "company_items_from_city_id_fkey" FOREIGN KEY ("from_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_items" ADD CONSTRAINT "company_items_to_city_id_fkey" FOREIGN KEY ("to_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_items" ADD CONSTRAINT "company_items_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_rules" ADD CONSTRAINT "profit_rules_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_rules" ADD CONSTRAINT "profit_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_logs" ADD CONSTRAINT "integration_sync_logs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "trip_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_origin_city_id_fkey" FOREIGN KEY ("origin_city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_destination_city_id_fkey" FOREIGN KEY ("destination_city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_service_lines" ADD CONSTRAINT "trip_service_lines_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_service_lines" ADD CONSTRAINT "trip_service_lines_company_item_id_fkey" FOREIGN KEY ("company_item_id") REFERENCES "company_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_service_lines" ADD CONSTRAINT "trip_service_lines_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_service_lines" ADD CONSTRAINT "trip_service_lines_from_city_id_fkey" FOREIGN KEY ("from_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_service_lines" ADD CONSTRAINT "trip_service_lines_to_city_id_fkey" FOREIGN KEY ("to_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_pickup_points" ADD CONSTRAINT "trip_pickup_points_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_pickup_points" ADD CONSTRAINT "trip_pickup_points_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_guides" ADD CONSTRAINT "trip_guides_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_guides" ADD CONSTRAINT "trip_guides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_images" ADD CONSTRAINT "trip_images_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "trip_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_trips" ADD CONSTRAINT "program_trips_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_trips" ADD CONSTRAINT "program_trips_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_decisions" ADD CONSTRAINT "registration_decisions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_decisions" ADD CONSTRAINT "registration_decisions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_decisions" ADD CONSTRAINT "registration_decisions_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_service_lines" ADD CONSTRAINT "offer_service_lines_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_service_lines" ADD CONSTRAINT "offer_service_lines_company_item_id_fkey" FOREIGN KEY ("company_item_id") REFERENCES "company_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_service_lines" ADD CONSTRAINT "offer_service_lines_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_targets" ADD CONSTRAINT "offer_targets_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_targets" ADD CONSTRAINT "offer_targets_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_targets" ADD CONSTRAINT "offer_targets_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_nationality_country_id_fkey" FOREIGN KEY ("nationality_country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_issuing_country_id_fkey" FOREIGN KEY ("issuing_country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_payer_customer_id_fkey" FOREIGN KEY ("payer_customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pickup_point_id_fkey" FOREIGN KEY ("pickup_point_id") REFERENCES "trip_pickup_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_discount_offer_id_fkey" FOREIGN KEY ("discount_offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_passengers" ADD CONSTRAINT "booking_passengers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_passengers" ADD CONSTRAINT "booking_passengers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_passengers" ADD CONSTRAINT "booking_passengers_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "customer_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_applications" ADD CONSTRAINT "visa_applications_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "booking_passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visa_applications" ADD CONSTRAINT "visa_applications_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_refund_of_id_fkey" FOREIGN KEY ("refund_of_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_trip_requests" ADD CONSTRAINT "custom_trip_requests_origin_city_id_fkey" FOREIGN KEY ("origin_city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_trip_requests" ADD CONSTRAINT "custom_trip_requests_destination_city_id_fkey" FOREIGN KEY ("destination_city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_trip_requests" ADD CONSTRAINT "custom_trip_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "trip_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_trip_requests" ADD CONSTRAINT "custom_trip_requests_assigned_branch_id_fkey" FOREIGN KEY ("assigned_branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_trip_requests" ADD CONSTRAINT "custom_trip_requests_handled_by_id_fkey" FOREIGN KEY ("handled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_trip_requests" ADD CONSTRAINT "custom_trip_requests_converted_booking_id_fkey" FOREIGN KEY ("converted_booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_trip_request_items" ADD CONSTRAINT "custom_trip_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "custom_trip_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_trip_request_items" ADD CONSTRAINT "custom_trip_request_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_trip_request_items" ADD CONSTRAINT "custom_trip_request_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_slides" ADD CONSTRAINT "landing_slides_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_slides" ADD CONSTRAINT "landing_slides_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_slides" ADD CONSTRAINT "landing_slides_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_images" ADD CONSTRAINT "achievement_images_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================================
--  Business rules Prisma cannot express (SRS 6.1). Kept in SQL so they hold even if
--  application code is bypassed.
-- =====================================================================================

-- AUTH-09: roles with scope ALL (Admin) have no branch; every other user has exactly one.
CREATE FUNCTION enforce_user_branch() RETURNS trigger AS $$
DECLARE role_scope "RoleScope";
BEGIN
  SELECT scope INTO role_scope FROM roles WHERE id = NEW.role_id;
  IF role_scope = 'ALL' AND NEW.branch_id IS NOT NULL THEN
    RAISE EXCEPTION 'users with an ALL-scope role cannot belong to a branch' USING ERRCODE = 'check_violation';
  ELSIF role_scope <> 'ALL' AND NEW.branch_id IS NULL THEN
    RAISE EXCEPTION 'users with a branch or assigned role must belong to a branch' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER users_branch_rule BEFORE INSERT OR UPDATE OF role_id, branch_id ON users
  FOR EACH ROW EXECUTE FUNCTION enforce_user_branch();

-- BKG-02: a booking targets exactly one of trip / program / offer.
ALTER TABLE bookings ADD CONSTRAINT bookings_one_target CHECK (num_nonnulls(trip_id, program_id, offer_id) = 1);
ALTER TABLE bookings ADD CONSTRAINT bookings_money_ok CHECK (
  passenger_count > 0 AND price_per_person >= 0 AND cost_per_person >= 0 AND surcharge_per_person >= 0
  AND discount_amount >= 0 AND total_amount >= 0 AND paid_amount >= 0
  AND refunded_amount >= 0 AND refunded_amount <= paid_amount);
ALTER TABLE offer_targets ADD CONSTRAINT offer_targets_one_target CHECK (num_nonnulls(trip_id, program_id) = 1);
ALTER TABLE registration_decisions ADD CONSTRAINT decisions_one_target CHECK (num_nonnulls(trip_id, program_id) = 1);
-- CTR-05: a requested service is either an existing company or "Other" free text.
ALTER TABLE custom_trip_request_items ADD CONSTRAINT request_item_company_or_other CHECK (company_id IS NOT NULL OR other_text IS NOT NULL);
ALTER TABLE custom_trip_requests ADD CONSTRAINT requests_dates_ok CHECK (desired_to >= desired_from AND passengers_count > 0);

ALTER TABLE company_items ADD CONSTRAINT items_cost_ok CHECK (cost_per_person >= 0);
ALTER TABLE companies ADD CONSTRAINT companies_rating_ok CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);
ALTER TABLE profit_rules ADD CONSTRAINT profit_rules_value_ok CHECK (value >= 0);
ALTER TABLE trips ADD CONSTRAINT trips_dates_ok CHECK (ends_at >= starts_at AND registration_deadline <= starts_at);
ALTER TABLE trips ADD CONSTRAINT trips_capacity_ok CHECK (min_passengers >= 1 AND max_passengers >= min_passengers AND confirmed_seats >= 0 AND confirmed_seats <= max_passengers);
ALTER TABLE trips ADD CONSTRAINT trips_money_ok CHECK (cost_per_person >= 0 AND price_per_person >= 0);
ALTER TABLE trip_service_lines ADD CONSTRAINT lines_ok CHECK (ends_at >= starts_at AND quantity >= 1 AND unit_cost >= 0 AND cost_snapshot >= 0 AND profit_value >= 0 AND selling_price >= 0);
ALTER TABLE trip_pickup_points ADD CONSTRAINT pickup_surcharge_ok CHECK (surcharge >= 0);
ALTER TABLE programs ADD CONSTRAINT programs_capacity_ok CHECK (min_passengers >= 1 AND max_passengers >= min_passengers AND confirmed_seats >= 0 AND confirmed_seats <= max_passengers);
ALTER TABLE offers ADD CONSTRAINT offers_ok CHECK (
  valid_to >= valid_from AND discount_value >= 0
  AND (discount_mode <> 'PERCENT' OR discount_value <= 100)
  AND (max_seats IS NULL OR (max_seats > 0 AND confirmed_seats <= max_seats)));
ALTER TABLE offer_service_lines ADD CONSTRAINT offer_lines_ok CHECK (quantity >= 1 AND unit_cost >= 0 AND cost_snapshot >= 0 AND profit_value >= 0 AND selling_price >= 0);
ALTER TABLE payments ADD CONSTRAINT payments_amount_ok CHECK (amount > 0);
ALTER TABLE payments ADD CONSTRAINT payments_refund_link CHECK ((kind = 'REFUND') = (refund_of_id IS NOT NULL));
ALTER TABLE landing_slides ADD CONSTRAINT slides_link_ok CHECK (
  (link_type = 'NONE') OR (link_type = 'TRIP' AND trip_id IS NOT NULL)
  OR (link_type = 'PROGRAM' AND program_id IS NOT NULL) OR (link_type = 'OFFER' AND offer_id IS NOT NULL));
ALTER TABLE site_settings ADD CONSTRAINT site_settings_single_row CHECK (id = 1);

-- PAY-05, AUD-02: payments, audit entries and booking history are append-only.
CREATE FUNCTION reject_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'insufficient_privilege';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER payments_append_only BEFORE UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION reject_change();
CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_change();
CREATE TRIGGER booking_events_append_only BEFORE UPDATE OR DELETE ON booking_events FOR EACH ROW EXECUTE FUNCTION reject_change();

-- BKG-10: every passenger of a trip, whether booked on the trip itself or on a program containing it.
CREATE VIEW v_trip_passengers AS
  SELECT b.trip_id, b.id AS booking_id, NULL::uuid AS program_id, b.status, bp.id AS passenger_id, bp.customer_id
  FROM bookings b JOIN booking_passengers bp ON bp.booking_id = b.id
  WHERE b.trip_id IS NOT NULL
  UNION ALL
  SELECT pt.trip_id, b.id, b.program_id, b.status, bp.id, bp.customer_id
  FROM bookings b
  JOIN program_trips pt ON pt.program_id = b.program_id
  JOIN booking_passengers bp ON bp.booking_id = b.id
  WHERE b.program_id IS NOT NULL;
