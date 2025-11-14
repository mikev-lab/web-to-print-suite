import {
  SubscriberConfig,
  SubscriberArgs,
  IProductModuleService,
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

const handleProductChange = async ({ id, container }: SubscriberArgs) => {
  const productModuleService =
    container.resolve<IProductModuleService>("productModuleService")
  const product = await productModuleService.retrieve(id, {
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

const handleVariantChange = async ({ id, container }: SubscriberArgs) => {
  const productModuleService =
    container.resolve<IProductModuleService>("productModuleService")
  const variant = await productModuleService.retrieveVariant(id, {
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

const handleProductDeletion = async ({ id }: SubscriberArgs) => {
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

const handleVariantDeletion = async ({ id }: SubscriberArgs) => {
  const docRef = db.collection("pricing_matrix").doc(id)
  await docRef.delete()
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
  subscriber: {
    "product.created": handleProductChange,
    "product.updated": handleProductChange,
    "product.deleted": handleProductDeletion,
    "product-variant.created": handleVariantChange,
    "product-variant.updated": handleVariantChange,
    "product-variant.deleted": handleVariantDeletion,
  },
}
