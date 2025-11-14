import {
  ProductService,
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/medusa"
import * as admin from "firebase-admin"

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`,
  })
}
const db = admin.firestore()

const BATCH_SIZE = 500

export default class FirestoreSyncSubscriber {
  private readonly productService: ProductService

  constructor({ productService, eventBusService }) {
    this.productService = productService
    eventBusService.subscribe("product.created", this.handleProductChange)
    eventBusService.subscribe("product.updated", this.handleProductChange)
    eventBusService.subscribe("product.deleted", this.handleProductDeletion)
    eventBusService.subscribe(
      "product-variant.created",
      this.handleVariantChange
    )
    eventBusService.subscribe(
      "product-variant.updated",
      this.handleVariantChange
    )
    eventBusService.subscribe(
      "product-variant.deleted",
      this.handleVariantDeletion
    )
  }

  handleProductChange = async ({ id }: SubscriberArgs<any>) => {
    const product = await this.productService.retrieve(id, {
      relations: ["variants"],
    })

    if (!product.variants || product.variants.length === 0) {
      return
    }

    const batch = db.batch()
    for (const variant of product.variants) {
      const docRef = db.collection("pricing_matrix").doc(variant.id)
      const dataToSet = {
        // Product-level data
        product_id: product.id,
        usage: product.usage || null,
        type: product.type || null,
        finish: product.finish || null,
        // Variant-level data (will be merged in handleVariantChange)
        // We set it here to ensure the document exists
        name: `${product.title} - ${variant.title}`,
        sku: variant.sku || null,
      }
      batch.set(docRef, dataToSet, { merge: true })
    }
    await batch.commit()
  }

  handleVariantChange = async ({ id, fields }: SubscriberArgs<any>) => {
    const variant = await this.productService.retrieveVariant(id, {
      relations: ["product"],
    })
    const product = variant.product

    const docRef = db.collection("pricing_matrix").doc(variant.id)
    const dataToSet = {
      // Product-level data
      product_id: product.id,
      usage: product.usage || null,
      type: product.type || null,
      finish: product.finish || null,
      // Variant-level data
      costPerSheet: variant.costPerM ? variant.costPerM / 1000 : null,
      costPerM: variant.costPerM || null,
      gsm: variant.gsm || null,
      parentHeight: variant.parentHeight || null,
      parentWidth: variant.parentWidth || null,
      sku: variant.sku || null,
      name: `${product.title} - ${variant.title}`,
    }

    await docRef.set(dataToSet, { merge: true })
  }

  handleProductDeletion = async ({ id }: SubscriberArgs<any>) => {
    // When a product is deleted, Medusa first deletes its variants,
    // which triggers handleVariantDeletion. However, if there are
    // variants left for any reason, we clean them up here.
    const collectionRef = db
      .collection("pricing_matrix")
      .where("product_id", "==", id)
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

  handleVariantDeletion = async ({ id }: SubscriberArgs<any>) => {
    const docRef = db.collection("pricing_matrix").doc(id)
    await docRef.delete()
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.created",
    "product-variant.updated",
    "product-variant.deleted",
  ],
  subscriber: FirestoreSyncSubscriber,
}
