import { MigrationInterface, QueryRunner } from "typeorm"

export class PaperDetailsMigration1678886400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "product_paper_details" (
        "id" character varying NOT NULL,
        "usage" character varying NOT NULL,
        "type" character varying NOT NULL,
        "finish" character varying NOT NULL,
        "product_id" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_paper_details" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_paper_details_product" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE
      );
    `)

    await queryRunner.query(`
      CREATE TABLE "product_variant_paper_details" (
        "id" character varying NOT NULL,
        "costPerM" numeric(10, 2) NOT NULL,
        "gsm" integer NOT NULL,
        "parentWidth" integer NOT NULL,
        "parentHeight" integer NOT NULL,
        "variant_id" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_variant_paper_details" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_variant_paper_details_variant" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("id") ON DELETE CASCADE
      );
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "product_variant_paper_details";`)
    await queryRunner.query(`DROP TABLE "product_paper_details";`)
  }
}
