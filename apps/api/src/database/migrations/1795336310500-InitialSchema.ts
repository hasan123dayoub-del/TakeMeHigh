import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1795336310500 implements MigrationInterface {
  name = 'InitialSchema1795336310500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`agency_settings\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`agency_id\` varchar(36) NOT NULL, \`public_page_enabled\` tinyint NOT NULL DEFAULT 0, \`public_tagline\` varchar(160) NULL, \`public_description\` text NULL, \`hero_image_url\` varchar(500) NULL, \`brand_color\` varchar(9) NOT NULL DEFAULT '#0F766E', \`deposit_percent\` decimal(5,2) NOT NULL DEFAULT '30.00', \`balance_due_days_before_departure\` smallint NOT NULL DEFAULT '7', \`whatsapp_number\` varchar(40) NULL, \`booking_terms\` text NULL, UNIQUE INDEX \`IDX_83a9518d2de4cab49776295df6\` (\`agency_id\`), UNIQUE INDEX \`REL_83a9518d2de4cab49776295df6\` (\`agency_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`agencies\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`name\` varchar(150) NOT NULL, \`slug\` varchar(80) NOT NULL, \`email\` varchar(190) NULL, \`phone\` varchar(40) NULL, \`address\` varchar(255) NULL, \`city\` varchar(100) NULL, \`country\` varchar(100) NULL, \`currency\` char(3) NOT NULL DEFAULT 'USD', \`timezone\` varchar(64) NOT NULL DEFAULT 'UTC', \`logo_url\` varchar(500) NULL, \`license_number\` varchar(60) NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, UNIQUE INDEX \`IDX_77c10291e442a33f0060b9cad0\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`agency_id\` varchar(36) NOT NULL, \`full_name\` varchar(120) NOT NULL, \`email\` varchar(190) NOT NULL, \`password_hash\` varchar(255) NOT NULL, \`role\` enum ('OWNER', 'ADMIN', 'OPERATIONS_MANAGER', 'BOOKING_AGENT', 'ACCOUNTANT') NOT NULL DEFAULT 'BOOKING_AGENT', \`phone\` varchar(40) NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`last_login_at\` datetime NULL, INDEX \`IDX_6fdb3282cea9ba5877ab476aa7\` (\`agency_id\`), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`activity_logs\` (\`id\` varchar(36) NOT NULL, \`agency_id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NULL, \`action\` varchar(64) NOT NULL, \`entity_type\` varchar(40) NOT NULL, \`entity_id\` varchar(36) NULL, \`summary\` varchar(255) NOT NULL, \`metadata\` json NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX \`IDX_67803148b5d03ef28dbdc5955e\` (\`agency_id\`, \`entity_type\`, \`entity_id\`), INDEX \`IDX_0d8c709372577e02277bf7ff50\` (\`agency_id\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`customers\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`agency_id\` varchar(36) NOT NULL, \`first_name\` varchar(80) NOT NULL, \`last_name\` varchar(80) NOT NULL, \`email\` varchar(190) NULL, \`phone\` varchar(40) NULL, \`nationality\` varchar(80) NULL, \`date_of_birth\` date NULL, \`passport_number\` varchar(40) NULL, \`passport_expiry\` date NULL, \`address\` varchar(255) NULL, \`notes\` text NULL, \`tags\` text NULL, INDEX \`IDX_4794cf517bc19743bf9c859989\` (\`agency_id\`), INDEX \`IDX_4a08f631dd074bc96e521468ea\` (\`agency_id\`, \`email\`), INDEX \`IDX_bbaf63ee91c3ca0bdb10dd4440\` (\`agency_id\`, \`phone\`), INDEX \`IDX_5c89a2db4e9d67212d94997ca0\` (\`agency_id\`, \`last_name\`, \`first_name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`destinations\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`agency_id\` varchar(36) NOT NULL, \`name\` varchar(120) NOT NULL, \`country\` varchar(100) NOT NULL, \`city\` varchar(100) NULL, \`description\` text NULL, \`image_url\` varchar(500) NULL, INDEX \`IDX_8a41cb8798e1c710d8d7488ca4\` (\`agency_id\`), UNIQUE INDEX \`IDX_123638d0b1329898106438752a\` (\`agency_id\`, \`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`trip_itineraries\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`agency_id\` varchar(36) NOT NULL, \`trip_id\` varchar(36) NOT NULL, \`day_number\` smallint UNSIGNED NOT NULL, \`title\` varchar(160) NOT NULL, \`description\` text NULL, \`location\` varchar(120) NULL, INDEX \`IDX_41e481f6763d140040a1c9622f\` (\`agency_id\`), UNIQUE INDEX \`IDX_6644e9ea8efc0d56b6d919afb4\` (\`trip_id\`, \`day_number\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`hotel_details\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`supplier_id\` varchar(36) NOT NULL, \`star_rating\` tinyint UNSIGNED NULL, \`total_rooms\` int UNSIGNED NULL, \`nightly_rate\` decimal(12,2) NOT NULL DEFAULT '0.00', \`room_types\` text NULL, \`amenities\` text NULL, \`check_in_time\` varchar(5) NULL, \`check_out_time\` varchar(5) NULL, UNIQUE INDEX \`IDX_1db1f7bcc7fda151f7e72a2258\` (\`supplier_id\`), UNIQUE INDEX \`REL_1db1f7bcc7fda151f7e72a2258\` (\`supplier_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`transportation_details\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`supplier_id\` varchar(36) NOT NULL, \`vehicle_type\` enum ('COACH', 'MINIBUS', 'VAN', 'CAR', 'FLIGHT', 'FERRY', 'TRAIN') NOT NULL DEFAULT 'COACH', \`fleet_size\` int UNSIGNED NULL, \`seats_per_vehicle\` int UNSIGNED NULL, \`daily_rate\` decimal(12,2) NOT NULL DEFAULT '0.00', \`license_number\` varchar(60) NULL, UNIQUE INDEX \`IDX_0395c1ec6379ac2055a8b3d0e9\` (\`supplier_id\`), UNIQUE INDEX \`REL_0395c1ec6379ac2055a8b3d0e9\` (\`supplier_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`suppliers\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`agency_id\` varchar(36) NOT NULL, \`type\` enum ('HOTEL', 'TRANSPORT', 'GUIDE', 'OTHER') NOT NULL, \`name\` varchar(150) NOT NULL, \`contact_name\` varchar(120) NULL, \`email\` varchar(190) NULL, \`phone\` varchar(40) NULL, \`city\` varchar(100) NULL, \`country\` varchar(100) NULL, \`address\` varchar(255) NULL, \`rating\` tinyint UNSIGNED NULL, \`notes\` text NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, INDEX \`IDX_82411358932af76889c96b29bc\` (\`agency_id\`), INDEX \`IDX_17a4b80e10dd3257d04a0df9b5\` (\`agency_id\`, \`name\`), INDEX \`IDX_944fb8638822accd1084dbe103\` (\`agency_id\`, \`type\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`trip_suppliers\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`agency_id\` varchar(36) NOT NULL, \`trip_id\` varchar(36) NOT NULL, \`supplier_id\` varchar(36) NOT NULL, \`service\` varchar(200) NOT NULL, \`quantity\` int UNSIGNED NOT NULL DEFAULT '1', \`unit_cost\` decimal(12,2) NOT NULL DEFAULT '0.00', \`total_cost\` decimal(12,2) NOT NULL DEFAULT '0.00', \`notes\` text NULL, INDEX \`IDX_929c148a94562f1d1b85a7b1c0\` (\`agency_id\`), INDEX \`IDX_90485fdd2c34287e339f8ba2c3\` (\`supplier_id\`), INDEX \`IDX_832dbec160bf7390edc6454abe\` (\`trip_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`trips\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`agency_id\` varchar(36) NOT NULL, \`code\` varchar(20) NOT NULL, \`title\` varchar(160) NOT NULL, \`slug\` varchar(180) NOT NULL, \`destination_id\` varchar(36) NOT NULL, \`summary\` varchar(300) NULL, \`description\` text NULL, \`departure_date\` date NOT NULL, \`return_date\` date NOT NULL, \`departure_location\` varchar(120) NULL, \`capacity\` int UNSIGNED NOT NULL, \`seats_booked\` int UNSIGNED NOT NULL DEFAULT '0', \`price_per_person\` decimal(12,2) NOT NULL DEFAULT '0.00', \`child_price\` decimal(12,2) NULL, \`cost_per_person\` decimal(12,2) NOT NULL DEFAULT '0.00', \`status\` enum ('DRAFT', 'PUBLISHED', 'FULL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT', \`is_public\` tinyint NOT NULL DEFAULT 0, \`cover_image_url\` varchar(500) NULL, \`inclusions\` text NULL, \`exclusions\` text NULL, INDEX \`IDX_634fb592707103851167924a18\` (\`agency_id\`), INDEX \`IDX_664a49d743514638832e701ef3\` (\`agency_id\`, \`status\`), INDEX \`IDX_6112ce939a1ef3d8fe211bf351\` (\`agency_id\`, \`departure_date\`), UNIQUE INDEX \`IDX_af6b3c098ed973af73b1398a36\` (\`agency_id\`, \`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`payments\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`agency_id\` varchar(36) NOT NULL, \`booking_id\` varchar(36) NOT NULL, \`amount\` decimal(12,2) NOT NULL DEFAULT '0.00', \`method\` enum ('CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE_WALLET') NOT NULL, \`is_deposit\` tinyint NOT NULL DEFAULT 0, \`reference\` varchar(80) NULL, \`paid_at\` datetime NOT NULL, \`notes\` text NULL, \`received_by_id\` varchar(36) NULL, INDEX \`IDX_94882ffd99d7af17a0fad28012\` (\`agency_id\`), INDEX \`IDX_e86edf76dc2424f123b9023a2b\` (\`booking_id\`), INDEX \`IDX_14a0773368e8a69f83b19c39fd\` (\`agency_id\`, \`paid_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`refunds\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`agency_id\` varchar(36) NOT NULL, \`booking_id\` varchar(36) NOT NULL, \`amount\` decimal(12,2) NOT NULL DEFAULT '0.00', \`method\` enum ('CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE_WALLET') NOT NULL, \`reason\` varchar(255) NOT NULL, \`refunded_at\` datetime NOT NULL, \`processed_by_id\` varchar(36) NULL, INDEX \`IDX_43988c68062b610eca4b5e51c7\` (\`agency_id\`), INDEX \`IDX_79e695ddb64f5784eb2e001719\` (\`booking_id\`), INDEX \`IDX_ff27e6b88c28937e7d11dca28b\` (\`agency_id\`, \`refunded_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`bookings\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`agency_id\` varchar(36) NOT NULL, \`reference\` varchar(20) NOT NULL, \`trip_id\` varchar(36) NOT NULL, \`customer_id\` varchar(36) NOT NULL, \`status\` enum ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING', \`source\` enum ('OFFICE', 'PHONE', 'WHATSAPP', 'PUBLIC_PAGE') NOT NULL DEFAULT 'OFFICE', \`adults\` smallint UNSIGNED NOT NULL, \`children\` smallint UNSIGNED NOT NULL DEFAULT '0', \`seats\` smallint UNSIGNED NOT NULL, \`unit_price\` decimal(12,2) NOT NULL DEFAULT '0.00', \`child_unit_price\` decimal(12,2) NOT NULL DEFAULT '0.00', \`subtotal\` decimal(12,2) NOT NULL DEFAULT '0.00', \`discount\` decimal(12,2) NOT NULL DEFAULT '0.00', \`total_amount\` decimal(12,2) NOT NULL DEFAULT '0.00', \`paid_amount\` decimal(12,2) NOT NULL DEFAULT '0.00', \`refunded_amount\` decimal(12,2) NOT NULL DEFAULT '0.00', \`payment_status\` enum ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'UNPAID', \`notes\` text NULL, \`special_requests\` text NULL, \`confirmed_at\` datetime NULL, \`cancelled_at\` datetime NULL, \`cancellation_reason\` varchar(255) NULL, \`created_by_id\` varchar(36) NULL, INDEX \`IDX_1a0e5be4669a0cf22f6e762d0f\` (\`agency_id\`), INDEX \`IDX_8e21b7ae33e7b0673270de4146\` (\`customer_id\`), INDEX \`IDX_edbfb04e162d66f308cbfdcd85\` (\`trip_id\`, \`status\`), INDEX \`IDX_eefce11ed46c41a607a8bc1870\` (\`agency_id\`, \`payment_status\`), INDEX \`IDX_c238df15a54a8a0a401c0bc9f0\` (\`agency_id\`, \`status\`, \`created_at\`), UNIQUE INDEX \`IDX_867a794d6b38531fc9049c26fb\` (\`agency_id\`, \`reference\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`booking_passengers\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`agency_id\` varchar(36) NOT NULL, \`booking_id\` varchar(36) NOT NULL, \`full_name\` varchar(160) NOT NULL, \`type\` enum ('ADULT', 'CHILD') NOT NULL DEFAULT 'ADULT', \`date_of_birth\` date NULL, \`passport_number\` varchar(40) NULL, \`nationality\` varchar(80) NULL, INDEX \`IDX_e230488753d3bfb2010ba425e1\` (\`agency_id\`), INDEX \`IDX_1e2d37c7eb82f4017a9a4a06bc\` (\`booking_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`expenses\` (\`id\` varchar(36) NOT NULL, \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), \`agency_id\` varchar(36) NOT NULL, \`category\` enum ('ACCOMMODATION', 'TRANSPORT', 'GUIDES', 'MEALS', 'MARKETING', 'OFFICE', 'SALARIES', 'OTHER') NOT NULL, \`description\` varchar(200) NOT NULL, \`amount\` decimal(12,2) NOT NULL DEFAULT '0.00', \`expense_date\` date NOT NULL, \`reference\` varchar(80) NULL, \`trip_id\` varchar(36) NULL, \`supplier_id\` varchar(36) NULL, \`created_by_id\` varchar(36) NULL, INDEX \`IDX_f6aab1806a0b7bd8d1545a1aba\` (\`agency_id\`), INDEX \`IDX_bf6ee0000d1ba3f09285986e14\` (\`trip_id\`), INDEX \`IDX_4dceb8d6769f9fb982012cb6c4\` (\`agency_id\`, \`category\`), INDEX \`IDX_4c6730c0fa8b5d960e90673727\` (\`agency_id\`, \`expense_date\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`agency_settings\` ADD CONSTRAINT \`FK_83a9518d2de4cab49776295df6d\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`FK_6fdb3282cea9ba5877ab476aa76\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`activity_logs\` ADD CONSTRAINT \`FK_ba382ad5876211fa9773b656db6\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`activity_logs\` ADD CONSTRAINT \`FK_d54f841fa5478e4734590d44036\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`customers\` ADD CONSTRAINT \`FK_4794cf517bc19743bf9c8599891\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`destinations\` ADD CONSTRAINT \`FK_8a41cb8798e1c710d8d7488ca49\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`trip_itineraries\` ADD CONSTRAINT \`FK_41e481f6763d140040a1c9622fb\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`trip_itineraries\` ADD CONSTRAINT \`FK_d56e5cf0dacc2f495e64f64cd65\` FOREIGN KEY (\`trip_id\`) REFERENCES \`trips\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`hotel_details\` ADD CONSTRAINT \`FK_1db1f7bcc7fda151f7e72a2258f\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`transportation_details\` ADD CONSTRAINT \`FK_0395c1ec6379ac2055a8b3d0e9e\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`suppliers\` ADD CONSTRAINT \`FK_82411358932af76889c96b29bc4\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`trip_suppliers\` ADD CONSTRAINT \`FK_929c148a94562f1d1b85a7b1c00\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`trip_suppliers\` ADD CONSTRAINT \`FK_832dbec160bf7390edc6454abe5\` FOREIGN KEY (\`trip_id\`) REFERENCES \`trips\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`trip_suppliers\` ADD CONSTRAINT \`FK_90485fdd2c34287e339f8ba2c35\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`trips\` ADD CONSTRAINT \`FK_634fb592707103851167924a185\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`trips\` ADD CONSTRAINT \`FK_a1a75a97ae7388c662bc76bb621\` FOREIGN KEY (\`destination_id\`) REFERENCES \`destinations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`payments\` ADD CONSTRAINT \`FK_94882ffd99d7af17a0fad280129\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`payments\` ADD CONSTRAINT \`FK_e86edf76dc2424f123b9023a2b2\` FOREIGN KEY (\`booking_id\`) REFERENCES \`bookings\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`payments\` ADD CONSTRAINT \`FK_fdb95dd85ac02027afaed80f139\` FOREIGN KEY (\`received_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`refunds\` ADD CONSTRAINT \`FK_43988c68062b610eca4b5e51c78\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`refunds\` ADD CONSTRAINT \`FK_79e695ddb64f5784eb2e001719d\` FOREIGN KEY (\`booking_id\`) REFERENCES \`bookings\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`refunds\` ADD CONSTRAINT \`FK_b7d1eaf9ed1c18fb9b4be69981c\` FOREIGN KEY (\`processed_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bookings\` ADD CONSTRAINT \`FK_1a0e5be4669a0cf22f6e762d0f7\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bookings\` ADD CONSTRAINT \`FK_45fa98a28a6944e39d8a5754bd1\` FOREIGN KEY (\`trip_id\`) REFERENCES \`trips\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bookings\` ADD CONSTRAINT \`FK_8e21b7ae33e7b0673270de4146f\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bookings\` ADD CONSTRAINT \`FK_2ab7f927262f1f56d6f45bca107\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`booking_passengers\` ADD CONSTRAINT \`FK_e230488753d3bfb2010ba425e1a\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`booking_passengers\` ADD CONSTRAINT \`FK_1e2d37c7eb82f4017a9a4a06bc8\` FOREIGN KEY (\`booking_id\`) REFERENCES \`bookings\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`expenses\` ADD CONSTRAINT \`FK_f6aab1806a0b7bd8d1545a1aba4\` FOREIGN KEY (\`agency_id\`) REFERENCES \`agencies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`expenses\` ADD CONSTRAINT \`FK_bf6ee0000d1ba3f09285986e14e\` FOREIGN KEY (\`trip_id\`) REFERENCES \`trips\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`expenses\` ADD CONSTRAINT \`FK_a30707018a9722e9551db12ea8a\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`expenses\` ADD CONSTRAINT \`FK_cb8a9ecdb628ea1befdbaf6e078\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    // Business-rule guards enforced by the database itself (TypeORM does not emit CHECKs for MySQL/MariaDB).
    await queryRunner.query(
      'ALTER TABLE `trips` ADD CONSTRAINT `chk_trips_seats` CHECK (`seats_booked` <= `capacity`)',
    );
    await queryRunner.query(
      'ALTER TABLE `trips` ADD CONSTRAINT `chk_trips_dates` CHECK (`return_date` >= `departure_date`)',
    );
    await queryRunner.query(
      'ALTER TABLE `trips` ADD CONSTRAINT `chk_trips_capacity` CHECK (`capacity` > 0)',
    );
    await queryRunner.query(
      'ALTER TABLE `bookings` ADD CONSTRAINT `chk_bookings_seats` CHECK (`adults` >= 1 AND `seats` = `adults` + `children`)',
    );
    await queryRunner.query(
      'ALTER TABLE `bookings` ADD CONSTRAINT `chk_bookings_amounts` CHECK (`total_amount` >= 0 AND `discount` >= 0 AND `refunded_amount` >= 0)',
    );
    await queryRunner.query(
      'ALTER TABLE `payments` ADD CONSTRAINT `chk_payments_amount` CHECK (`amount` > 0)',
    );
    await queryRunner.query(
      'ALTER TABLE `refunds` ADD CONSTRAINT `chk_refunds_amount` CHECK (`amount` > 0)',
    );
    await queryRunner.query(
      'ALTER TABLE `expenses` ADD CONSTRAINT `chk_expenses_amount` CHECK (`amount` > 0)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `trips` DROP CONSTRAINT `chk_trips_seats`',
    );
    await queryRunner.query(
      'ALTER TABLE `trips` DROP CONSTRAINT `chk_trips_dates`',
    );
    await queryRunner.query(
      'ALTER TABLE `trips` DROP CONSTRAINT `chk_trips_capacity`',
    );
    await queryRunner.query(
      'ALTER TABLE `bookings` DROP CONSTRAINT `chk_bookings_seats`',
    );
    await queryRunner.query(
      'ALTER TABLE `bookings` DROP CONSTRAINT `chk_bookings_amounts`',
    );
    await queryRunner.query(
      'ALTER TABLE `payments` DROP CONSTRAINT `chk_payments_amount`',
    );
    await queryRunner.query(
      'ALTER TABLE `refunds` DROP CONSTRAINT `chk_refunds_amount`',
    );
    await queryRunner.query(
      'ALTER TABLE `expenses` DROP CONSTRAINT `chk_expenses_amount`',
    );
    await queryRunner.query(
      `ALTER TABLE \`expenses\` DROP FOREIGN KEY \`FK_cb8a9ecdb628ea1befdbaf6e078\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`expenses\` DROP FOREIGN KEY \`FK_a30707018a9722e9551db12ea8a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`expenses\` DROP FOREIGN KEY \`FK_bf6ee0000d1ba3f09285986e14e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`expenses\` DROP FOREIGN KEY \`FK_f6aab1806a0b7bd8d1545a1aba4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`booking_passengers\` DROP FOREIGN KEY \`FK_1e2d37c7eb82f4017a9a4a06bc8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`booking_passengers\` DROP FOREIGN KEY \`FK_e230488753d3bfb2010ba425e1a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bookings\` DROP FOREIGN KEY \`FK_2ab7f927262f1f56d6f45bca107\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bookings\` DROP FOREIGN KEY \`FK_8e21b7ae33e7b0673270de4146f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bookings\` DROP FOREIGN KEY \`FK_45fa98a28a6944e39d8a5754bd1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bookings\` DROP FOREIGN KEY \`FK_1a0e5be4669a0cf22f6e762d0f7\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`refunds\` DROP FOREIGN KEY \`FK_b7d1eaf9ed1c18fb9b4be69981c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`refunds\` DROP FOREIGN KEY \`FK_79e695ddb64f5784eb2e001719d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`refunds\` DROP FOREIGN KEY \`FK_43988c68062b610eca4b5e51c78\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`payments\` DROP FOREIGN KEY \`FK_fdb95dd85ac02027afaed80f139\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`payments\` DROP FOREIGN KEY \`FK_e86edf76dc2424f123b9023a2b2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`payments\` DROP FOREIGN KEY \`FK_94882ffd99d7af17a0fad280129\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`trips\` DROP FOREIGN KEY \`FK_a1a75a97ae7388c662bc76bb621\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`trips\` DROP FOREIGN KEY \`FK_634fb592707103851167924a185\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`trip_suppliers\` DROP FOREIGN KEY \`FK_90485fdd2c34287e339f8ba2c35\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`trip_suppliers\` DROP FOREIGN KEY \`FK_832dbec160bf7390edc6454abe5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`trip_suppliers\` DROP FOREIGN KEY \`FK_929c148a94562f1d1b85a7b1c00\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`suppliers\` DROP FOREIGN KEY \`FK_82411358932af76889c96b29bc4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`transportation_details\` DROP FOREIGN KEY \`FK_0395c1ec6379ac2055a8b3d0e9e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`hotel_details\` DROP FOREIGN KEY \`FK_1db1f7bcc7fda151f7e72a2258f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`trip_itineraries\` DROP FOREIGN KEY \`FK_d56e5cf0dacc2f495e64f64cd65\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`trip_itineraries\` DROP FOREIGN KEY \`FK_41e481f6763d140040a1c9622fb\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`destinations\` DROP FOREIGN KEY \`FK_8a41cb8798e1c710d8d7488ca49\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`customers\` DROP FOREIGN KEY \`FK_4794cf517bc19743bf9c8599891\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`activity_logs\` DROP FOREIGN KEY \`FK_d54f841fa5478e4734590d44036\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`activity_logs\` DROP FOREIGN KEY \`FK_ba382ad5876211fa9773b656db6\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_6fdb3282cea9ba5877ab476aa76\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`agency_settings\` DROP FOREIGN KEY \`FK_83a9518d2de4cab49776295df6d\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_4c6730c0fa8b5d960e90673727\` ON \`expenses\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_4dceb8d6769f9fb982012cb6c4\` ON \`expenses\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_bf6ee0000d1ba3f09285986e14\` ON \`expenses\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_f6aab1806a0b7bd8d1545a1aba\` ON \`expenses\``,
    );
    await queryRunner.query(`DROP TABLE \`expenses\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_1e2d37c7eb82f4017a9a4a06bc\` ON \`booking_passengers\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_e230488753d3bfb2010ba425e1\` ON \`booking_passengers\``,
    );
    await queryRunner.query(`DROP TABLE \`booking_passengers\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_867a794d6b38531fc9049c26fb\` ON \`bookings\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_c238df15a54a8a0a401c0bc9f0\` ON \`bookings\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_eefce11ed46c41a607a8bc1870\` ON \`bookings\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_edbfb04e162d66f308cbfdcd85\` ON \`bookings\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8e21b7ae33e7b0673270de4146\` ON \`bookings\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_1a0e5be4669a0cf22f6e762d0f\` ON \`bookings\``,
    );
    await queryRunner.query(`DROP TABLE \`bookings\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_ff27e6b88c28937e7d11dca28b\` ON \`refunds\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_79e695ddb64f5784eb2e001719\` ON \`refunds\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_43988c68062b610eca4b5e51c7\` ON \`refunds\``,
    );
    await queryRunner.query(`DROP TABLE \`refunds\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_14a0773368e8a69f83b19c39fd\` ON \`payments\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_e86edf76dc2424f123b9023a2b\` ON \`payments\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_94882ffd99d7af17a0fad28012\` ON \`payments\``,
    );
    await queryRunner.query(`DROP TABLE \`payments\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_af6b3c098ed973af73b1398a36\` ON \`trips\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_6112ce939a1ef3d8fe211bf351\` ON \`trips\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_664a49d743514638832e701ef3\` ON \`trips\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_634fb592707103851167924a18\` ON \`trips\``,
    );
    await queryRunner.query(`DROP TABLE \`trips\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_832dbec160bf7390edc6454abe\` ON \`trip_suppliers\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_90485fdd2c34287e339f8ba2c3\` ON \`trip_suppliers\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_929c148a94562f1d1b85a7b1c0\` ON \`trip_suppliers\``,
    );
    await queryRunner.query(`DROP TABLE \`trip_suppliers\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_944fb8638822accd1084dbe103\` ON \`suppliers\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_17a4b80e10dd3257d04a0df9b5\` ON \`suppliers\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_82411358932af76889c96b29bc\` ON \`suppliers\``,
    );
    await queryRunner.query(`DROP TABLE \`suppliers\``);
    await queryRunner.query(
      `DROP INDEX \`REL_0395c1ec6379ac2055a8b3d0e9\` ON \`transportation_details\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_0395c1ec6379ac2055a8b3d0e9\` ON \`transportation_details\``,
    );
    await queryRunner.query(`DROP TABLE \`transportation_details\``);
    await queryRunner.query(
      `DROP INDEX \`REL_1db1f7bcc7fda151f7e72a2258\` ON \`hotel_details\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_1db1f7bcc7fda151f7e72a2258\` ON \`hotel_details\``,
    );
    await queryRunner.query(`DROP TABLE \`hotel_details\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_6644e9ea8efc0d56b6d919afb4\` ON \`trip_itineraries\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_41e481f6763d140040a1c9622f\` ON \`trip_itineraries\``,
    );
    await queryRunner.query(`DROP TABLE \`trip_itineraries\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_123638d0b1329898106438752a\` ON \`destinations\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_8a41cb8798e1c710d8d7488ca4\` ON \`destinations\``,
    );
    await queryRunner.query(`DROP TABLE \`destinations\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_5c89a2db4e9d67212d94997ca0\` ON \`customers\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_bbaf63ee91c3ca0bdb10dd4440\` ON \`customers\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_4a08f631dd074bc96e521468ea\` ON \`customers\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_4794cf517bc19743bf9c859989\` ON \`customers\``,
    );
    await queryRunner.query(`DROP TABLE \`customers\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_0d8c709372577e02277bf7ff50\` ON \`activity_logs\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_67803148b5d03ef28dbdc5955e\` ON \`activity_logs\``,
    );
    await queryRunner.query(`DROP TABLE \`activity_logs\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_6fdb3282cea9ba5877ab476aa7\` ON \`users\``,
    );
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_77c10291e442a33f0060b9cad0\` ON \`agencies\``,
    );
    await queryRunner.query(`DROP TABLE \`agencies\``);
    await queryRunner.query(
      `DROP INDEX \`REL_83a9518d2de4cab49776295df6\` ON \`agency_settings\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_83a9518d2de4cab49776295df6\` ON \`agency_settings\``,
    );
    await queryRunner.query(`DROP TABLE \`agency_settings\``);
  }
}
