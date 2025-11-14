import { Column, Entity } from "typeorm"
import { Product as MedusaProduct } from "@medusajs/medusa"

@Entity()
export class Product extends MedusaProduct {
  @Column({ type: "varchar", nullable: true })
  usage: string | null

  @Column({ type: "varchar", nullable: true })
  type: string | null

  @Column({ type: "varchar", nullable: true })
  finish: string | null
}
