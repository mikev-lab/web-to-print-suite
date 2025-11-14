import { createHook } from "@medusajs/workflows-sdk"
import { Modules } from "@medusajs/utils"
import { FirestoreSyncService } from "../services/firestore-sync"

export const productVariantCreatedWorkflow = createHook(
  "productVariantCreated",
  async (variant, { container }) => {
    const firestoreSyncService: FirestoreSyncService = container.resolve(
      `${Modules.PRODUCT}.firestoreSyncService`
    )
    await firestoreSyncService.syncVariant(variant.id)
  }
)
