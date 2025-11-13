export declare const assemblePrintPDF: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    finalCoverPath: string;
    finalInteriorPath: string;
}>>;
export declare const getDynamicPrice: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    totalPrice: number;
    estimatedDeliveryDate: string;
    spineWidthInches: number;
    calculationDetails: {
        bwPaperThicknessInches: number;
        colorPaperThicknessInches: number;
        internalSpineInches: number;
        coverSpineAllowanceInches: number;
        totalMaterialCost: number;
        totalPrintCost: number;
    };
}>>;
//# sourceMappingURL=index.d.ts.map