import currencyCodes from 'currency-codes';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedIsoCurrencies1758570763304 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const currencies = currencyCodes
      .codes()
      .map((code) => {
        const currency = currencyCodes.code(code)!;
        return `('${currency.code}', ${currency.digits}, '${currency.currency.replace("'", "''")}')`;
      })
      .join(',\n            ');

    await queryRunner.query(`
            INSERT INTO currencies (code, exponent, name) VALUES
            ${currencies}
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM currencies`);
  }
}
