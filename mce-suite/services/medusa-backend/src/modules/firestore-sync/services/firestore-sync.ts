import { ProductService, TransactionBaseService } from "@medusajs/medusa"
import * as admin from "firebase-admin"

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`,
  })
}
const db = admin.firestore()

export class FirestoreSyncService extends TransactionBaseService {
  private readonly productService_: ProductService

  constructor(container) {
    super(container)
    this.productService_ = container.resolve("productService")
  }

  async syncProduct(productId: string) {
    const product = await this.productService_.retrieve(productId, {
      relations: ["variants", "paper_details"],
    })

    if (!product.variants || product.variants.length === 0) {
      return
    }

    const batch = db.batch()
    for (const variant of product.variants) {
      const docRef = db.collection("pricing_matrix").doc(variant.id)
      const dataToSet = {
        product_id: product.id,
        usage: product.paper_details?.usage || null,
        type: product.paper_details?.type || null,
        finish: product.paper_details?.finish || null,
        name: `${product.title} - ${variant.title}`,
        sku: variant.sku || null,
      }
      batch.set(docRef, dataToSet, { merge: true })
    }
    await batch.commit()
  }

  async syncVariant(variantId: string) {
    const variant = await this.productService_.retrieveVariant(variantId, {
      relations: ["product", "product.paper_details", "paper_details"],
    })
    const product = variant.product

    const docRef = db.collection("pricing_matrix").doc(variant.id)
    const dataToSet = {
      product_id: product.id,
      usage: product.paper_details?.usage || null,
      type: product.paper_details?.type || null,
      finish: product.paper_details?.finish || null,
      costPerSheet: variant.paper_details?.costPerM
        ? variant.paper_details.costPerM / 1000
        : null,
      costPerM: variant.paper_details?.costPerM || null,
      gsm: variant.paper_details?.gsm || null,
      parentHeight: variant.paper_details?.parentHeight || null,
      parentWidth: variant.paper_details?.parentWidth || null,
      sku: variant.sku || null,
      name: `${product.title} - ${variant.title}`,
    }

    await docRef.set(dataToSet, { merge: true })
  }

  async deleteProduct(productId: string) {
    const collectionRef = db
      .collection("pricing_matrix")
      .where("product_id", "==", productId)
    const snapshot = await collectionRef.get()

    if (snapshot.empty) {
      return
    }

    const batch = db.batch()
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })
    await batch.commit()
  }

  async deleteVariant(variantId: string) {
    const docRef = db.collection("pricing_matrix").doc(variantId)
    await docRef.delete()
  }
}
