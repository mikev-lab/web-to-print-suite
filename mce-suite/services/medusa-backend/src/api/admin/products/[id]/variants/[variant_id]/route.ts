import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/medusa"
import {
  AdminPostProductsProductVariantsVariantReq,
  AdminProductsProductRes,
} from "@medusajs/medusa"
import {
  defaultAdminProductFields,
  defaultAdminProductRelations,
} from "@medusajs/medusa"
import {
  ProductPaperDetails,
  ProductVariantPaperDetails,
} from "../../../../../models"

export const POST = async (
  req: MedusaRequest<AdminPostProductsProductVariantsVariantReq>,
  res: MedusaResponse<AdminProductsProductRes>
) => {
  const { id, variant_id } = req.params
  const { paper_details, ...variantData } = req.body

  // 1. Update the core variant data
  const productModule = req.scope.resolve("productModuleService")
  await productModule.updateVariant(variant_id, variantData)

  // 2. Update the custom paper details
  if (paper_details) {
    const paperDetailsRepo = req.scope.resolve(
      "productVariantPaperDetailsRepository"
    )
    await paperDetailsRepo.save({
      variant_id: variant_id,
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
