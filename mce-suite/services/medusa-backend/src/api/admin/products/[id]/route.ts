import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/medusa"
import {
  AdminPostProductsProductReq,
  AdminProductsProductRes,
} from "@medusajs/medusa"
import {
  defaultAdminProductFields,
  defaultAdminProductRelations,
} from "@medusajs/medusa"
import {
  ProductPaperDetails,
  ProductVariantPaperDetails,
} from "../../../models"

export const POST = async (
  req: MedusaRequest<AdminPostProductsProductReq>,
  res: MedusaResponse<AdminProductsProductRes>
) => {
  const { id } = req.params
  const { paper_details, ...productData } = req.body

  // 1. Update the core product data
  const productModule = req.scope.resolve("productModuleService")
  await productModule.update(id, productData)

  // 2. Update the custom paper details
  if (paper_details) {
    const paperDetailsRepo = req.scope.resolve("productPaperDetailsRepository")
    await paperDetailsRepo.save({
      product_id: id,
      ...paper_details,
    })
  }

  // 3. Fetch the updated product with all relations
  const product = await productModule.retrieve(id, {
    relations: defaultAdminProductRelations,
    fields: defaultAdminProductFields,
  })

  res.status(200).json({ product })
}
