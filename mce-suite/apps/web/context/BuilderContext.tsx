'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of the form specifications
interface Specs {
  quantity: number;
  finishedWidth: number;
  finishedHeight: number;
  bwPages: number;
  colorPages: number;
  bwPaperSku: string;
  colorPaperSku: string;
  coverPaperSku: string;
  hasCover: boolean;
  coverPrintsOnBothSides: boolean;
  bindingMethod: string;
  laminationType: string;
  coverPrintColor: string;
}

// Define the shape of the pricing results
interface PricingResults {
  totalPrice: number;
  spineWidthInches: number;
}

// Define the shape of the context state
interface BuilderContextState {
  specs: Specs;
  updateSpecs: (newSpecs: Partial<Specs>) => void;
  pricingResults: PricingResults;
  setPricingResults: (results: PricingResults) => void;
  // Add other state and setters as needed for file uploads, etc.
}

// Create the context with a default value
const BuilderContext = createContext<BuilderContextState | undefined>(undefined);

// Create the provider component
export const BuilderProvider = ({ children }: { children: ReactNode }) => {
  const [specs, setSpecs] = useState<Specs>({
    quantity: 1,
    finishedWidth: 8.5,
    finishedHeight: 11,
    bwPages: 0,
    colorPages: 0,
    bwPaperSku: '',
    colorPaperSku: '',
    coverPaperSku: '',
    hasCover: true,
    coverPrintsOnBothSides: false,
    bindingMethod: '',
    laminationType: '',
    coverPrintColor: '',
  });

  const [pricingResults, setPricingResults] = useState<PricingResults>({
    totalPrice: 0,
    spineWidthInches: 0,
  });

  const updateSpecs = (newSpecs: Partial<Specs>) => {
    setSpecs((prevSpecs) => ({
      ...prevSpecs,
      ...newSpecs,
    }));
  };

  const value = {
    specs,
    updateSpecs,
    pricingResults,
    setPricingResults,
  };

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
};

// Create the custom hook for using the context
export const useBuilder = () => {
  const context = useContext(BuilderContext);
  if (context === undefined) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
};
