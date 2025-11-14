import { BaseEntity, ProductVariant } from "@medusajs/medusa"
import { generateEntityId } from "@medusajs/utils"
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
} from "typeorm"

@Entity()
export class ProductVariantPaperDetails extends BaseEntity {
  @Column({ type: "decimal", precision: 10, scale: 2 })
  costPerM: number

  @Column({ type: "integer" })
  gsm: number

  @Column({ type: "integer" })
  parentWidth: number

  @Column({ type: "integer" })
  parentHeight: number

  @Column()
  variant_id: string

  @OneToOne(() => ProductVariant, (variant) => variant.paper_details)
  @JoinColumn({ name: "variant_id" })
  variant: ProductVariant

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, "var_paper_dtls")
  }
}
