import { defineLink } from "@medusajs/framework"
import { Product } from "@medusajs/medusa"
import { ProductPaperDetails } from "../models/product-paper-details"

export default defineLink({
  product: {
    service: "product",
    relationship: {
      type: "one-to-one",
      primaryKey: "id",
      foreignKey: "product_id",
    },
  },
  product_paper_details: {
    service: "productPaperDetails",
    relationship: {
      type: "one-to-one",
      primaryKey: "product_id",
      foreignKey: "id",
    },
  },
})
