import { Column, Entity } from "typeorm"
import { ProductVariant as MedusaProductVariant } from "@medusajs/medusa"

@Entity()
export class ProductVariant extends MedusaProductVariant {
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  costPerM: number | null

  @Column({ type: "integer", nullable: true })
  gsm: number | null

  @Column({ type: "integer", nullable: true })
  parentWidth: number | null

  @Column({ type: "integer", nullable: true })
  parentHeight: number | null
}
