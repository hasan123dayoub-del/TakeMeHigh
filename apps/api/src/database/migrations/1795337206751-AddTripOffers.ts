import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripOffers1795337206751 implements MigrationInterface {
  name = 'AddTripOffers1795337206751';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`trips\` ADD \`offer_price\` decimal(12,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`trips\` ADD \`offer_label\` varchar(60) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`trips\` ADD \`offer_ends_at\` date NULL`,
    );
    // An offer must be a real discount on the normal adult price.
    await queryRunner.query(
      'ALTER TABLE `trips` ADD CONSTRAINT `chk_trips_offer` CHECK (`offer_price` IS NULL OR (`offer_price` > 0 AND `offer_price` < `price_per_person`))',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `trips` DROP CONSTRAINT `chk_trips_offer`");
    await queryRunner.query(
      `ALTER TABLE \`trips\` DROP COLUMN \`offer_ends_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`trips\` DROP COLUMN \`offer_label\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`trips\` DROP COLUMN \`offer_price\``,
    );
  }
}
