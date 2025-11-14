import { createHook } from "@medusajs/workflows-sdk"
import { Modules } from "@medusajs/utils"
import { FirestoreSyncService } from "../services/firestore-sync"

export const productUpdatedWorkflow = createHook(
  "productUpdated",
  async (product, { container }) => {
    const firestoreSyncService: FirestoreSyncService = container.resolve(
      `${Modules.PRODUCT}.firestoreSyncService`
    )
    await firestoreSyncService.syncProduct(product.id)
  }
)
