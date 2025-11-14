import { BaseEntity, Product } from "@medusajs/medusa"
import { generateEntityId } from "@medusajs/utils"
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
} from "typeorm"

@Entity()
export class ProductPaperDetails extends BaseEntity {
  @Column({ type: "varchar" })
  usage: string

  @Column({ type: "varchar" })
  type: string

  @Column({ type: "varchar" })
  finish: string

  @Column()
  product_id: string

  @OneToOne(() => Product, (product) => product.paper_details)
  @JoinColumn({ name: "product_id" })
  product: Product

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, "prod_paper_dtls")
  }
}
