"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import medusa from "../../../lib/medusa";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cartId = searchParams.get("cartId");
  const [cart, setCart] = useState(null);
  const [shippingInfo, setShippingInfo] = useState({
    full_name: "",
    address_1: "",
    address_2: "",
    city: "",
    province: "",
    postal_code: "",
    country_code: "",
  });
  const [checkoutStep, setCheckoutStep] = useState("shipping");

  useEffect(() => {
    if (cartId) {
      medusa.carts.retrieve(cartId).then(({ cart }) => {
        setCart(cart);
      }).catch((error) => {
        console.error("Error retrieving cart:", error);
      });
    }
  }, [cartId]);

  const handleShippingChange = (e) => {
    setShippingInfo({
      ...shippingInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handleContinueToPayment = async () => {
    if (cartId) {
      await medusa.carts.update(cartId, {
        shipping_address: {
          first_name: shippingInfo.full_name.split(" ")[0],
          last_name: shippingInfo.full_name.split(" ").slice(1).join(" "),
          address_1: shippingInfo.address_1,
          address_2: shippingInfo.address_2,
          city: shippingInfo.city,
          province: shippingInfo.province,
          postal_code: shippingInfo.postal_code,
          country_code: shippingInfo.country_code,
        },
      });
      setCheckoutStep("payment");
    }
  };

  const handlePayment = async () => {
    if (cartId) {
      await medusa.carts.complete(cartId);
      router.push("/order/confirmed");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      {cart ? (
        <div>
          {checkoutStep === "shipping" && (
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Shipping Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={shippingInfo.full_name}
                    onChange={handleShippingChange}
                  />
                </div>
                <div>
                  <Label htmlFor="address_1">Address Line 1</Label>
                  <Input
                    id="address_1"
                    name="address_1"
                    value={shippingInfo.address_1}
                    onChange={handleShippingChange}
                  />
                </div>
                <div>
                  <Label htmlFor="address_2">Address Line 2 (Optional)</Label>
                  <Input
                    id="address_2"
                    name="address_2"
                    value={shippingInfo.address_2}
                    onChange={handleShippingChange}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={shippingInfo.city}
                    onChange={handleShippingChange}
                  />
                </div>
                <div>
                  <Label htmlFor="province">State / Province</Label>
                  <Input
                    id="province"
                    name="province"
                    value={shippingInfo.province}
                    onChange={handleShippingChange}
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    name="postal_code"
                    value={shippingInfo.postal_code}
                    onChange={handleShippingChange}
                  />
                </div>
                <div>
                  <Label htmlFor="country_code">Country</Label>
                  <Input
                    id="country_code"
                    name="country_code"
                    value={shippingInfo.country_code}
                    onChange={handleShippingChange}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={handleContinueToPayment}>
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}
          {checkoutStep === "payment" && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Payment</h2>
              <p>
                This is a mocked payment page. Click the button below to
                simulate a successful payment.
              </p>
              <div className="mt-4">
                <Button onClick={handlePayment}>
                  Simulate Successful Payment
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p>Loading cart...</p>
      )}
    </div>
  );
}
