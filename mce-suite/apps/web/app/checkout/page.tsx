import { Suspense } from 'react';
import CheckoutClientPage from './CheckoutClientPage';

export default function CheckoutPage() {
  return (
    // This Suspense boundary fixes the build error
    <Suspense fallback={<div className="container mx-auto p-4">Loading cart...</div>}>
      <CheckoutClientPage />
    </Suspense>
  );
}