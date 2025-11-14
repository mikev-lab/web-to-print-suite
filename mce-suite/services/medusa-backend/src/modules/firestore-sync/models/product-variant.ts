import { ProductVariant as MedusaProductVariant } from "@medusajs/medusa"
import { Entity, OneToOne } from "typeorm"
import { ProductVariantPaperDetails } from "./product-variant-paper-details"

@Entity()
export class ProductVariant extends MedusaProductVariant {
  @OneToOne(
    () => ProductVariantPaperDetails,
    (paperDetails) => paperDetails.variant
  )
  paper_details: ProductVariantPaperDetails
}
