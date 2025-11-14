import { defineLink } from "@medusajs/framework"
import { ProductVariant } from "@medusajs/medusa"
import { ProductVariantPaperDetails } from "../models/product-variant-paper-details"

export default defineLink({
  product_variant: {
    service: "productVariant",
    relationship: {
      type: "one-to-one",
      primaryKey: "id",
      foreignKey: "variant_id",
    },
  },
  product_variant_paper_details: {
    service: "productVariantPaperDetails",
    relationship: {
      type: "one-to-one",
      primaryKey: "variant_id",
      foreignKey: "id",
    },
  },
})
