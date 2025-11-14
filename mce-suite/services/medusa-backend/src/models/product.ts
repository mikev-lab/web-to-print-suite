import { Product as MedusaProduct } from "@medusajs/medusa"
import { Entity, OneToOne } from "typeorm"
import { ProductPaperDetails } from "./product-paper-details"

@Entity()
export class Product extends MedusaProduct {
  @OneToOne(
    () => ProductPaperDetails,
    (paperDetails) => paperDetails.product
  )
  paper_details: ProductPaperDetails
}
