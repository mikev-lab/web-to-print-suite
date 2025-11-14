import { createHook } from "@medusajs/workflows-sdk"
import { Modules } from "@medusajs/utils"
import { FirestoreSyncService } from "../services/firestore-sync"

export const productCreatedWorkflow = createHook(
  "productCreated",
  async (product, { container }) => {
    const firestoreSyncService: FirestoreSyncService = container.resolve(
      `${Modules.PRODUCT}.firestoreSyncService`
    )
    await firestoreSyncService.syncProduct(product.id)
  }
)
