import Medusa from "@medusajs/medusa-js";

const medusa = new Medusa({
  baseUrl: "http://localhost:9000",
  maxRetries: 3,
});

async function createProduct() {
  try {
    // Authenticate with the Medusa backend
    const { data } = await medusa.admin.auth.createSession({
      email: "admin@medusa-test.com",
      password: "password",
    });

    // Set the session cookie for subsequent requests
    medusa.client.defaults.headers.common['Cookie'] = data.cookie;

    // Create the product
    const { product } = await medusa.admin.products.create({
      title: "MCE Paper Sample Pack",
      is_giftcard: false,
      discountable: true,
      options: [{ title: "Size" }],
      variants: [
        {
          title: "One Size",
          prices: [{ currency_code: "usd", amount: 500 }], // $5.00
          options: [{ value: "One Size" }],
        },
      ],
    });

    console.log("Product created successfully!");
    console.log("Variant ID:", product.variants[0].id);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.error("Authentication failed. Please check your admin credentials.");
    } else if (error.code === 'ECONNREFUSED') {
      console.error("Connection refused. Is the Medusa backend running at http://localhost:9000?");
    }
    else {
      console.error("Error creating product:", error);
    }
  }
}

createProduct();
