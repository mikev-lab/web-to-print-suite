'use client';

import { useBuilder } from '@/context/BuilderContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugDetails() {
    const { pricingResults } = useBuilder();
    // Use the nested calculationDetails object from the context
    const details = pricingResults.calculationDetails || {};
    
    // Do not render anything if the details object is not populated (e.g., initial load)
    // We check for 'internalSpineInches' as a required field.
    if (details.internalSpineInches === undefined) {
        return null;
    }

    return (
        <Card>
            <CardHeader><CardTitle className="text-md">Verbose Calculation Details</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1">
                <p><strong>Paper Thickness (B/W):</strong> {details.bwPaperThicknessInches.toFixed(6)}"</p>
                <p><strong>Paper Thickness (Color):</strong> {details.colorPaperThicknessInches.toFixed(6)}"</p>
                <hr className="my-1" />
                <p><strong>Internal Block Spine:</strong> {details.internalSpineInches.toFixed(4)}"</p>
                <p><strong>Cover Allowance:</strong> {details.coverSpineAllowanceInches.toFixed(4)}" (Lamination + Cover Stock)</p>
                <hr className="my-1" />
                <p><strong>Total Material Cost:</strong> ${details.totalMaterialCost.toFixed(2)}</p>
                <p><strong>Total Print/Labor Cost:</strong> ${details.totalPrintCost.toFixed(2)}</p>
                <hr className="my-1" />
                <p className="text-sm font-semibold">Final Spine Width: {pricingResults.spineWidthInches.toFixed(4)}"</p>
            </CardContent>
        </Card>
    );
}