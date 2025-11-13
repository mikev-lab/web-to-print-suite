'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of the form specifications
interface Specs {
  quantity: number;
  size: string; // New field for size dropdown
  internalPages: number;
  interiorIsColor: boolean; // true for Color, false for B&W
  bwPaperSku: string;
  colorPaperSku: string;
  coverPaperSku: string;
  hasCover: boolean;
  bindingMethod: string;
  laminationType: string;
  coverPrintColor: string;
}

interface CalculationDetails {
  bwPaperThicknessInches: number; // Thickness per page of B&W paper used
  colorPaperThicknessInches: number; // Thickness per page of Color paper used
  internalSpineInches: number; // Total spine calculation *before* cover wrap
  coverSpineAllowanceInches: number; // Spine allowance for the cover wrap paper
  totalMaterialCost: number;
  totalPrintCost: number;
  // Add any other intermediate variables you want to inspect
}

// Define the shape of the pricing results
interface PricingResults {
  totalPrice: number;
  spineWidthInches: number;
  calculationDetails: CalculationDetails;
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
    size: 'Letter',
    internalPages: 16,
    interiorIsColor: false, // Default to B&W
    bwPaperSku: '',
    colorPaperSku: '',
    coverPaperSku: '',
    hasCover: true,
    bindingMethod: 'perfect-bound',
    laminationType: 'None',
    coverPrintColor: '4/0 Full Color One Side',
  });

  const [pricingResults, setPricingResults] = useState<PricingResults>({
    totalPrice: 0,
    spineWidthInches: 0,
    calculationDetails: {
      bwPaperThicknessInches: 0,
      colorPaperThicknessInches: 0,
      internalSpineInches: 0,
      coverSpineAllowanceInches: 0,
      totalMaterialCost: 0,
      totalPrintCost: 0,
    },
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
