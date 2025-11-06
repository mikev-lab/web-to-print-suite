import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

admin.initializeApp();
const db = admin.firestore();

interface Specs {
  productId: string;
  quantity: number;
  pageCount?: number;
  [key: string]: string | number | undefined;
}

const getPriceFromTiers = (tiers: { [key: string]: number }, quantity: number): number => {
  let applicableTierPrice = 0;
  let highestTierMin = -1;

  const parsedTiers = Object.keys(tiers)
    .map((tier) => {
      const [minStr, maxStr] = tier.split("-");
      const min = parseInt(minStr!, 10);
      const max = maxStr ? parseInt(maxStr, 10) : Infinity;
      return { min, max, price: tiers[tier]! };
    })
    .filter((t) => !isNaN(t.min));

  parsedTiers.sort((a, b) => a.min - b.min);

  for (const tier of parsedTiers) {
    if (tier.min > highestTierMin) {
      highestTierMin = tier.min;
      applicableTierPrice = tier.price;
    }
    if (quantity >= tier.min && (isNaN(tier.max) || quantity <= tier.max)) {
      return tier.price;
    }
  }

  return applicableTierPrice;
};

export const getDynamicPrice = onCall(async (request) => {
  try {
    const specs: Specs = request.data.specs;

    if (!specs.productId) {
      throw new HttpsError("invalid-argument", "Missing required field: productId");
    }
    if (!specs.quantity || specs.quantity <= 0) {
      throw new HttpsError("invalid-argument", "Quantity must be a positive number.");
    }

    const productDoc = await db.collection("products").doc(specs.productId).get();
    if (!productDoc.exists) {
      throw new HttpsError("not-found", `Product with ID ${specs.productId} not found.`);
    }

    const productData = productDoc.data();
    if (!productData) {
        throw new HttpsError("internal", "Product data is missing.");
    }

    if (productData.options) {
      for (const optionKey in productData.options) {
        if (!specs[optionKey]) {
          throw new HttpsError("invalid-argument", `Missing required spec for "${specs.productId}": ${optionKey}`);
        }
      }
    }

    let totalPrice = 0.0;
    const productOptions = productData.options;

    if (productOptions) {
      for (const specKey in productOptions) {
        const specOption = productOptions[specKey];
        if (specOption.pricingDoc) {
          const pricingDoc = await db.collection("pricing_matrix").doc(specOption.pricingDoc).get();
          if (pricingDoc.exists) {
            const pricingData = pricingDoc.data();
            if (!pricingData) {
              throw new HttpsError("internal", `Pricing data for ${specOption.pricingDoc} is missing.`);
            }
            const specValue = specs[specKey];
            if (typeof specValue !== 'string') {
              throw new HttpsError('invalid-argument', `Spec value for ${specKey} must be a string.`);
            }
            let price = 0;

            if (specOption.pricingLogic === "modifier") {
              continue;
            }

            let priceData = pricingData[specValue];

            const modifierSpecKey = Object.keys(productOptions).find(
              (key) => productOptions[key].pricingLogic === "modifier"
            );

            if (modifierSpecKey) {
              const modifierSpecValue = specs[modifierSpecKey];
              if (typeof modifierSpecValue === 'string' && priceData && typeof priceData === 'object' && priceData[modifierSpecValue]) {
                priceData = priceData[modifierSpecValue];
              }
            }

            if (typeof priceData === "number") {
              price = priceData;
            } else if (typeof priceData === "object" && priceData !== null) {
              price = getPriceFromTiers(priceData, specs.quantity);
            }


            if (specOption.pricingLogic === "per-page") {
              if (typeof specs.pageCount !== 'number' || specs.pageCount <= 0) {
                throw new HttpsError('invalid-argument', 'A valid pageCount is required for per-page pricing.');
              }
              totalPrice += price * specs.pageCount * specs.quantity;
            } else if (specOption.pricingLogic === "per-item") {
              totalPrice += price * specs.quantity;
            }
          }
        }
      }
    }

    const prodTime = productData.baseProductionTime || 0;
    const shippingTime = 3; // Stubbed shipping
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + prodTime + shippingTime);

    return {
      totalPrice,
      estimatedDeliveryDate: estimatedDeliveryDate.toISOString(),
    };
  } catch (error) {
    logger.error("Error in getDynamicPrice:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "An unexpected error occurred.", error);
  }
});
