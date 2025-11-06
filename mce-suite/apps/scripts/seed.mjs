import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp({
  // Assumes Firebase project configuration is set up in the environment
});

const db = admin.firestore();

const productsData = {
  book: {
    productName: "Books (Doujinshi, Manga)",
    baseProductionTime: 5,
    options: {
      binding: {
        perfect: { name: "Perfect Bound" },
        saddle: { name: "Saddle Stitch" },
      },
      size: {
        A5: { name: "A5 (5.8\" x 8.3\")" },
        B5: { name: "B5 (7\" x 10\")" },
        Letter: { name: "US Letter (8.5\" x 11\")" },
      },
      coverStock: {
        "100lb_gloss": { name: "100lb Gloss" },
        "100lb_matte": { name: "100lb Matte" },
      },
    },
    validationRules: {
      perfectBinding: { minPages: 18 },
      saddleStitch: { pageMultiple: 4, maxPages: 32 },
    },
  },
  art_print: {
    productName: "Art Prints",
    baseProductionTime: 2,
    options: {
      size: {
        "4x6": { name: "4\" x 6\"" },
        "8x10": { name: "8\" x 10\"" },
        "11x17": { name: "11\" x 17\"" },
      },
      stock: {
        "100lb_gloss": { name: "100lb Gloss" },
      },
    },
    validationRules: {},
  },
  sticker: {
    productName: "Stickers",
    baseProductionTime: 3,
    options: {},
    validationRules: {},
  },
};

const pricingMatrixData = {
  interior_bw: {
    paper_80lb_matte: 0.015,
    paper_100lb_gloss: 0.018,
    paper_60lb_uncoated: 0.012,
  },
  cover_color: {
    stock_100lb_gloss: 0.25,
    stock_100lb_matte: 0.27,
  },
  lamination: {
    gloss_lamination: 0.15,
    matte_lamination: 0.17,
  },
};

const seed = async () => {
  console.log('Seeding products collection...');
  for (const [id, data] of Object.entries(productsData)) {
    await db.collection('products').doc(id).set(data);
    console.log(`  - Wrote ${id}`);
  }
  console.log('Products collection seeded successfully.');

  console.log('Seeding pricing_matrix collection...');
  for (const [id, data] of Object.entries(pricingMatrixData)) {
    await db.collection('pricing_matrix').doc(id).set(data);
    console.log(`  - Wrote ${id}`);
  }
  console.log('Pricing_matrix collection seeded successfully.');
};

seed().catch(console.error);
