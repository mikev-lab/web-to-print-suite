import { Module, Modules } from "@medusajs/utils"
import { FirestoreSyncService } from "./services/firestore-sync"

export default Module(Modules.PRODUCT, {
  service: FirestoreSyncService,
})
