'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Medusa from "@medusajs/medusa-js";
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { notFound } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure the PDF worker to avoid issues with Next.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// Define the type for the order data for type safety
interface OrderSpecs {
  finishedWidth: number;
  finishedHeight: number;
  // Add other spec properties as needed
}

interface Order {
  id: string;
  status: string;
  finalCoverPath?: string;
  finalInteriorPath?: string;
  totalPrice?: number;
  specs?: OrderSpecs;
  // Add other order properties as needed
}

export default function ProofPage({ params }: { params: { orderId: string } }) {
  const { orderId } = params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Order ID is missing.');
      setLoading(false);
      return;
    }

    const orderRef = doc(db, 'orders', orderId);

    const unsubscribe = onSnapshot(
      orderRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Omit<Order, 'id'>;
          setOrder({ id: docSnap.id, ...data });
          setError(null);
        } else {
          setError('Order not found.');
          setOrder(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching order:', err);
        setError('Failed to load order information.');
        setLoading(false);
      }
    );

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading proof...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="p-8">
          <p className="text-red-500 font-semibold">Error</p>
          <p>{error}</p>
        </Card>
      </div>
    );
  }

  if (!order) {
    // This case should be covered by the error state, but as a fallback:
    return notFound();
  }

  if (order.status === 'building') {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="p-8">
          <h2 className="text-xl font-bold mb-4">Your proof is being generated.</h2>
          <p>This may take a few moments. Please wait...</p>
        </Card>
      </div>
    );
  }

  if (order.status === 'pending_approval' && order.finalCoverPath && order.finalInteriorPath) {
    return <ProofViewer order={order} />;
  }
  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="p-8">
        <p className="text-red-500 font-semibold">Error</p>
        <p>Proof not found or is still processing.</p>
      </Card>
    </div>
  );
}

// ============== Proofing Overlay Component ==============

interface ProofingOverlayProps {
  pageWidth: number; // rendered width in px
  pageHeight: number; // rendered height in px
  finishedWidth: number; // spec width in inches
  finishedHeight: number; // spec height in inches
}

function ProofingOverlay({ pageWidth, pageHeight, finishedWidth, finishedHeight }: ProofingOverlayProps) {
  if (!pageWidth || !pageHeight || !finishedWidth || !finishedHeight) {
    return null; // Don't render if we don't have all the dimensions
  }

  // Calculate the ratio of pixels to inches based on the rendered width
  const pixelsPerInch = pageWidth / finishedWidth;

  // --- Bleed Line (Outer) ---
  // The bleed is 0.125 inches outside the trim box on all sides.
  const bleedOffset = 0.125 * pixelsPerInch;
  const bleedStyle: React.CSSProperties = {
    position: 'absolute',
    top: `-${bleedOffset}px`,
    left: `-${bleedOffset}px`,
    right: `-${bleedOffset}px`,
    bottom: `-${bleedOffset}px`,
    border: '1px solid red',
    pointerEvents: 'none', // Prevents the overlay from blocking interactions with the PDF
  };

  // --- Safe Zone (Inner) ---
  // The safe zone is 0.125 inches inside the trim box on all sides.
  const safeZoneOffset = 0.125 * pixelsPerInch;
  const safeZoneStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${safeZoneOffset}px`,
    left: `${safeZoneOffset}px`,
    right: `${safeZoneOffset}px`,
    bottom: `${safeZoneOffset}px`,
    border: '1px solid blue',
    pointerEvents: 'none',
  };

  return (
    <>
      <div style={bleedStyle} data-testid="bleed-overlay" />
      <div style={safeZoneStyle} data-testid="safe-zone-overlay" />
    </>
  );
}

// ============== Proof Viewer Component ==============

interface ProofViewerProps {
  order: Order;
}

function ProofViewer({ order }: ProofViewerProps) {
  const router = useRouter();
  const [isApproved, setIsApproved] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interiorPages, setInteriorPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfContainerWidth, setPdfContainerWidth] = useState(0);
  const [renderedPageDimensions, setRenderedPageDimensions] = useState<{ width: number; height: number } | null>(null);

  const medusa = new Medusa({
    baseUrl: process.env.NEXT_PUBLIC_MEDUSA_URL || "http://localhost:9000",
    maxRetries: 3,
  });

  async function handleApproval() {
    setIsProcessing(true);
    try {
      // 1. Update Firestore
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        status: 'pending_payment',
        proofApprovedTimestamp: serverTimestamp(),
      });

      // 2. Create Medusa Cart
      const cart = await medusa.carts.create();

      // 3. Add Custom Line Item
      // Medusa requires the price to be in the smallest currency unit (e.g., cents)
      const priceInCents = Math.round((order.totalPrice || 0) * 100);

      await medusa.carts.lineItems.create(cart.cart.id, {
        title: `Custom Book Order ${order.id}`,
        quantity: 1,
        unit_price: priceInCents,
      });

      // 4. Redirect to Checkout
      router.push(`/checkout?cartId=${cart.cart.id}`);

    } catch (error) {
      console.error("Failed to process approval:", error);
      // Optionally: show an error message to the user
      setIsProcessing(false);
    }
  }

  const containerRef = (node: HTMLDivElement) => {
    if (node) {
      // Set a timeout to ensure the container has been fully rendered in the DOM
      setTimeout(() => {
        setPdfContainerWidth(node.getBoundingClientRect().width);
      }, 0);
    }
  };

  function onInteriorLoadSuccess({ numPages }: { numPages: number }) {
    setInteriorPages(numPages);
  }

  function onPageRenderSuccess(page: any) {
    setRenderedPageDimensions({ width: page.width, height: page.height });
  }

  function goToPrevPage() {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }

  function goToNextPage() {
    setCurrentPage((prev) => Math.min(prev + 1, interiorPages));
  }

  // Fallback if paths are missing, though parent component already checks this
  if (!order.finalCoverPath || !order.finalInteriorPath) {
    return <p>PDF paths are not available.</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Review Your Proof</h1>
          <p className="text-muted-foreground">
            Order ID: {order.id}
          </p>
        </div>
        <div className="flex flex-col items-center gap-4">
            <div className="flex items-center space-x-2">
                <Checkbox id="terms" checked={isApproved} onCheckedChange={(checked) => setIsApproved(!!checked)} />
                <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    I have reviewed all pages, bleed, and safe zones, and I approve this proof for printing.
                </label>
            </div>
            <Button onClick={handleApproval} disabled={!isApproved || isProcessing}>
                {isProcessing ? 'Processing...' : 'Approve & Proceed to Payment'}
            </Button>
        </div>
      </div>

      <Tabs defaultValue="cover">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cover">Cover</TabsTrigger>
          <TabsTrigger value="interior">Interior</TabsTrigger>
        </TabsList>

        <TabsContent value="cover">
          <div className="mt-4 p-4 border rounded-lg" ref={containerRef}>
            {pdfContainerWidth > 0 && (
              <div className="relative mx-auto" style={{ width: pdfContainerWidth }}>
                <Document file={order.finalCoverPath}>
                  <Page pageNumber={1} width={pdfContainerWidth} onRenderSuccess={onPageRenderSuccess} />
                </Document>
                {renderedPageDimensions && order.specs && (
                  <ProofingOverlay
                    pageWidth={renderedPageDimensions.width}
                    pageHeight={renderedPageDimensions.height}
                    finishedWidth={order.specs.finishedWidth}
                    finishedHeight={order.specs.finishedHeight}
                  />
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="interior">
          <div className="mt-4 p-4 border rounded-lg">
             {pdfContainerWidth > 0 && (
               <div className="relative mx-auto" style={{ width: pdfContainerWidth }}>
                  <Document file={order.finalInteriorPath} onLoadSuccess={onInteriorLoadSuccess}>
                    <Page pageNumber={currentPage} width={pdfContainerWidth} onRenderSuccess={onPageRenderSuccess} />
                  </Document>
                  {renderedPageDimensions && order.specs && (
                    <ProofingOverlay
                      pageWidth={renderedPageDimensions.width}
                      pageHeight={renderedPageDimensions.height}
                      finishedWidth={order.specs.finishedWidth}
                      finishedHeight={order.specs.finishedHeight}
                    />
                  )}
                </div>
             )}

            <div className="flex items-center justify-center mt-4 gap-4">
              <Button onClick={goToPrevPage} disabled={currentPage <= 1}>
                Previous Page
              </Button>
              <span>
                Page {currentPage} of {interiorPages}
              </span>
              <Button onClick={goToNextPage} disabled={currentPage >= interiorPages}>
                Next Page
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
