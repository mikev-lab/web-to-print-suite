import Medusa from "@medusajs/medusa-js";

const medusa = new Medusa({
  baseUrl: "http://localhost:9000",
  maxRetries: 3,
});

export default medusa;
