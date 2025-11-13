import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { PDFDocument, PDFImage, PDFEmbeddedPage } from 'pdf-lib';
import { JobDetails, Order, PaperStock, PrintColor } from './types';

initializeApp();
const db = getFirestore();
const storage = getStorage();

export const assemblePrintPDF = onCall(async (request) => {
  const { orderId } = request.data;

  if (!orderId) {
    throw new HttpsError('invalid-argument', 'The function must be called with an "orderId".');
  }

  const orderRef = db.collection('orders').doc(orderId);

  try {
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      throw new HttpsError('not-found', `Order ${orderId} not found.`);
    }
    const order = orderDoc.data() as Order;

    const { specs, spineWidthInches, fileUploads } = order;
    if (!specs || !spineWidthInches || !fileUploads) {
      throw new HttpsError('failed-precondition', 'Order document is missing required fields.');
    }

    const downloadFile = async (path: string): Promise<Buffer> => {
      const [file] = await storage.bucket().file(path).download();
      return file;
    };

    const [interiorFile, frontFile, backFile, spineFile] = await Promise.all([
      downloadFile(fileUploads.interior.path),
      downloadFile(fileUploads.front.path),
      downloadFile(fileUploads.back.path),
      downloadFile(fileUploads.spine.path),
    ]);

    // ** Cover Assembly **
    const { finishedWidth, finishedHeight } = specs;
    const totalWidthInches = (2 * finishedWidth) + spineWidthInches;
    const totalHeightInches = finishedHeight;

    const coverPdfDoc = await PDFDocument.create();
    const page = coverPdfDoc.addPage([totalWidthInches * 72, totalHeightInches * 72]);

    const embedImage = async (fileBuffer: Buffer, fileType: string) => {
      if (fileType.startsWith('image/')) {
        return fileType === 'image/png'
          ? await coverPdfDoc.embedPng(fileBuffer)
          : await coverPdfDoc.embedJpg(fileBuffer);
      } else if (fileType === 'application/pdf') {
        const externalPdf = await PDFDocument.load(fileBuffer);
        const [embeddedPage] = await coverPdfDoc.embedPdf(externalPdf, [0]);
        return embeddedPage;
      }
      throw new HttpsError('invalid-argument', `Unsupported file type: ${fileType}`);
    };

    const drawCoverPart = async (fileBuffer: Buffer, path: string, x: number, y: number, width: number, height: number, transform: 'stretch' | 'fill') => {
      const fileType = path.endsWith('.png') ? 'image/png' : path.endsWith('.jpg') || path.endsWith('.jpeg') ? 'image/jpeg' : 'application/pdf';
      const embeddedContent = await embedImage(fileBuffer, fileType);

      if (!embeddedContent) {
        throw new HttpsError('internal', 'Failed to embed content.');
      }

      const dims = embeddedContent.size();

      let drawWidth = width;
      let drawHeight = height;
      let imgX = x;
      let imgY = y;

      if (transform === 'fill') {
        const targetAspectRatio = width / height;
        const imageAspectRatio = dims.width / dims.height;

        if (imageAspectRatio > targetAspectRatio) {
          drawHeight = height;
          drawWidth = height * imageAspectRatio;
          imgX = x - (drawWidth - width) / 2;
        } else {
          drawWidth = width;
          drawHeight = width / imageAspectRatio;
          imgY = y - (drawHeight - height) / 2;
        }
      }

      if (embeddedContent instanceof PDFImage) {
        page.drawImage(embeddedContent, { x: imgX, y: imgY, width: drawWidth, height: drawHeight });
      } else if (embeddedContent instanceof PDFEmbeddedPage) {
        page.drawPage(embeddedContent, { x: imgX, y: imgY, width: drawWidth, height: drawHeight });
      }
    };

    const finishedWidthPt = finishedWidth * 72;
    const finishedHeightPt = finishedHeight * 72;
    const spineWidthPt = spineWidthInches * 72;

    await drawCoverPart(backFile, fileUploads.back.path, 0, 0, finishedWidthPt, finishedHeightPt, fileUploads.back.transform);
    await drawCoverPart(spineFile, fileUploads.spine.path, finishedWidthPt, 0, spineWidthPt, finishedHeightPt, fileUploads.spine.transform);
    await drawCoverPart(frontFile, fileUploads.front.path, finishedWidthPt + spineWidthPt, 0, finishedWidthPt, finishedHeightPt, fileUploads.front.transform);

    const finalCoverPdfBytes = await coverPdfDoc.save();
    const finalInteriorPdfBytes = interiorFile;

    const coverPath = `processed_files/${orderId}/final_cover.pdf`;
    const interiorPath = `processed_files/${orderId}/final_interior.pdf`;

    await Promise.all([
      storage.bucket().file(coverPath).save(finalCoverPdfBytes),
      storage.bucket().file(interiorPath).save(finalInteriorPdfBytes),
    ]);

    await orderRef.update({
      status: 'pending_approval',
      finalCoverPath: coverPath,
      finalInteriorPath: interiorPath,
    });

    return { success: true, finalCoverPath: coverPath, finalInteriorPath: interiorPath };
  } catch (error) {
    console.error(`PDF assembly failed for order ${orderId}:`, error);
    await orderRef.update({ status: 'assembly_failed' });
    throw new HttpsError('internal', 'PDF assembly failed. Please check your files and try again.');
  }
});

export const getDynamicPrice = onCall(async (request) => {
  const { data: specs } = request;

  if (!specs) {
    throw new HttpsError('invalid-argument', 'The function must be called with one argument "specs".');
  }

  const businessRulesDoc = await db.collection('config').doc('business_rules').get();
  if (!businessRulesDoc.exists) {
    throw new HttpsError('not-found', 'Business rules not found.');
  }
  const businessRules = businessRulesDoc.data() as any;

  const {
    laborRate = businessRules.defaultLaborRate,
    markupPercent = businessRules.defaultMarkupPercent,
    spoilagePercent = businessRules.defaultSpoilagePercent,
  } = businessRules;

  const calculateImposition = (parentW: number, parentH: number, jobW: number, jobH: number) => {
    if (jobW <= 0 || jobH <= 0) return 0;
    const fit1 = Math.floor(parentW / jobW) * Math.floor(parentH / jobH);
    const fit2 = Math.floor(parentW / jobH) * Math.floor(parentH / jobW);
    return Math.max(fit1, fit2);
  };

  const getPaperThicknessInches = (paper: PaperStock) => {
    const caliperFactor = paper.type === 'Coated' ? 0.9 : 1.3;
    const caliperMicrons = paper.gsm * caliperFactor;
    return caliperMicrons / 25400;
  };

  const calculateCosts = async (details: JobDetails) => {
    const {
      quantity, finishedWidth, finishedHeight,
      bwPages, bwPaperSku, colorPages, colorPaperSku,
      hasCover, coverPaperSku, coverPrintColor, coverPrintsOnBothSides, laminationType, bindingMethod,
    } = details;

    const [bwPaperDoc, colorPaperDoc, coverPaperDoc] = await Promise.all([
      bwPaperSku ? db.collection('pricing_matrix').doc(bwPaperSku).get() : Promise.resolve(null),
      colorPaperSku ? db.collection('pricing_matrix').doc(colorPaperSku).get() : Promise.resolve(null),
      coverPaperSku ? db.collection('pricing_matrix').doc(coverPaperSku).get() : Promise.resolve(null),
    ]);

    const bwPaper = bwPaperDoc?.exists ? (bwPaperDoc.data() as PaperStock) : null;
    const colorPaper = colorPaperDoc?.exists ? (colorPaperDoc.data() as PaperStock) : null;
    const coverPaper = coverPaperDoc?.exists ? (coverPaperDoc.data() as PaperStock) : null;

    // --- START: NEW Intermediate Variables for Debugging ---
    let bwPaperThickness = 0;
    let colorPaperThickness = 0;
    let internalSpineInches = 0;
    let coverSpineAllowanceInches = 0;
    let totalMaterialCost = 0;
    let totalPrintCost = 0;
    let finalSpineWidth = 0;

    // Assume lamination thickness (0.005 inches per side) if not in business rules
    const LAMINATION_THICKNESS_INCHES = businessRules.LAMINATION_THICKNESS_INCHES || 0.005;
    // --- END: NEW Intermediate Variables for Debugging ---

    const totalInteriorPages = (bwPages > 0 ? bwPages : 0) + (colorPages > 0 ? colorPages : 0);
    if (bindingMethod === 'saddleStitch' && totalInteriorPages > 0 && totalInteriorPages % 4 !== 0) {
      throw new HttpsError('invalid-argument', 'Saddle stitch requires the total interior page count to be a multiple of 4.');
    }

    const spoilageMultiplier = 1 + ((spoilagePercent || 0) / 100);

    const bwImposition = bwPaper ? calculateImposition(bwPaper.parentWidth, bwPaper.parentHeight, finishedWidth, finishedHeight) : 0;
    const colorImposition = colorPaper ? calculateImposition(colorPaper.parentWidth, colorPaper.parentHeight, finishedWidth, finishedHeight) : 0;

    let coverImposition = 0;
    
    // RENAMED from spineWidth to internalSpineInches (to match verbose view)
    if (hasCover && coverPaper) {
      if (bindingMethod === 'perfectBound') {
        const bwLeaves = Math.ceil((bwPages > 0 ? bwPages : 0) / 2);
        const colorLeaves = Math.ceil((colorPages > 0 ? colorPages : 0) / 2);

        // Capture B/W Paper Thickness
        bwPaperThickness = (bwPaper && bwPages > 0) ? getPaperThicknessInches(bwPaper) : 0;
        // Capture Color Paper Thickness
        colorPaperThickness = (colorPaper && colorPages > 0) ? getPaperThicknessInches(colorPaper) : 0;

        // Calculate interior block spine
        internalSpineInches = (bwLeaves * bwPaperThickness) + (colorLeaves * colorPaperThickness);
        
        // Calculate cover thickness allowance (1 sheet, 2 sides)
        const coverThickness = getPaperThicknessInches(coverPaper);
        // FIX: Changed 'None' to 'none' to match the LaminationType enum/literal type
        const laminationThickness = laminationType !== 'none' ? LAMINATION_THICKNESS_INCHES * 2 : 0;
        
        coverSpineAllowanceInches = coverThickness + laminationThickness;

        // Final spine width for the cover design
        finalSpineWidth = internalSpineInches + coverSpineAllowanceInches;

      } else {
          // Saddle-stitch has negligible spine thickness for calculation
          internalSpineInches = 0;
          finalSpineWidth = 0; 
      }
      
      // Use the FINAL spine width when calculating the required cover spread width
      const coverSpreadWidth = (finishedWidth * 2) + finalSpineWidth; 
      const coverSpreadHeight = finishedHeight;
      const maxPossibleImposition = calculateImposition(coverPaper.parentWidth, coverPaper.parentHeight, coverSpreadWidth, coverSpreadHeight);

      if (maxPossibleImposition >= 1) {
        coverImposition = 1;
      } else {
        coverImposition = 0;
      }
    }

    if (bwPaper && bwImposition === 0 && bwPages > 0) throw new HttpsError('invalid-argument', 'Finished size does not fit on the B/W interior paper.');
    if (colorPaper && colorImposition === 0 && colorPages > 0) throw new HttpsError('invalid-argument', 'Finished size does not fit on the Color interior paper.');
    if (hasCover && coverPaper && coverImposition === 0) throw new HttpsError('invalid-argument', 'Full cover spread (including spine) does not fit on the selected cover paper.');

    const bwPressSheets = Math.ceil((bwImposition > 0 ? Math.ceil(quantity * Math.ceil((bwPages > 0 ? bwPages : 0) / 2) / bwImposition) : 0) * spoilageMultiplier);
    const bwPaperCost = bwPaper ? bwPressSheets * bwPaper.costPerSheet : 0;
    const bwClicks = bwPressSheets * 2;
    const bwClickCost = bwClicks * businessRules.BW_CLICK_COST;

    const colorPressSheets = Math.ceil((colorImposition > 0 ? Math.ceil(quantity * Math.ceil((colorPages > 0 ? colorPages : 0) / 2) / colorImposition) : 0) * spoilageMultiplier);
    const colorPaperCost = colorPaper ? colorPressSheets * colorPaper.costPerSheet : 0;
    const colorClicks = colorPressSheets * 2;
    const colorClickCost = colorClicks * businessRules.COLOR_CLICK_COST;

    let coverPressSheets = 0, coverPaperCost = 0, coverClickCost = 0, coverClicks = 0;
    if (hasCover) {
      coverPressSheets = Math.ceil((coverImposition > 0 ? Math.ceil(quantity / coverImposition) : 0) * spoilageMultiplier);
      coverPaperCost = coverPaper ? coverPressSheets * coverPaper.costPerSheet : 0;
      const coverClickRate = coverPrintColor === PrintColor.COLOR ? businessRules.COLOR_CLICK_COST : businessRules.BW_CLICK_COST;
      coverClicks = coverPressSheets * (coverPrintsOnBothSides ? 2 : 1);
      coverClickCost = coverClicks * coverClickRate;
    }

    const laminationCost = (hasCover && laminationType !== 'none' && quantity > 0) ? (laminationType === 'gloss' ? businessRules.GLOSS_LAMINATE_COST_PER_COVER : businessRules.MATTE_LAMINATE_COST_PER_COVER) * quantity : 0;

    // Capture verbose material and print costs
    totalMaterialCost = bwPaperCost + colorPaperCost + coverPaperCost;
    totalPrintCost = bwClickCost + colorClickCost + coverClickCost;

    const totalPressSheets = bwPressSheets + colorPressSheets + coverPressSheets;
    const printingTimeMins = totalPressSheets / businessRules.PRINTING_SPEED_SPM;

    let laminatingTimeMins = 0;
    if (hasCover && laminationType !== 'none' && coverPaper && coverPressSheets > 0) {
      const sheetLengthMeters = coverPaper.parentHeight * 0.0254;
      laminatingTimeMins = (coverPressSheets * sheetLengthMeters) / 5 /* LAMINATING_SPEED_MPM */;
    }

    let bindingTimeMins = 0;
    let bindingSetupMins = 0;
    if (quantity > 0 && bindingMethod !== 'none') {
      if (bindingMethod === 'perfectBound') {
          bindingSetupMins = businessRules.PERFECT_BINDER_SETUP_MINS;
          bindingTimeMins = (quantity / (businessRules.PERFECT_BINDER_SPEED_BPH / 60));
      } else if (bindingMethod === 'saddleStitch') {
          bindingSetupMins = businessRules.SADDLE_STITCHER_SETUP_MINS;
          bindingTimeMins = (quantity / (businessRules.SADDLE_STITCHER_SPEED_BPH / 60));
      }
      bindingTimeMins *= businessRules.BINDING_INEFFICIENCY_FACTOR;
    }

    const trimmingTimeMins = quantity > 0 ? businessRules.TRIMMING_SETUP_MINS + (Math.ceil(quantity / businessRules.TRIMMING_BOOKS_PER_CYCLE) * businessRules.TRIMMING_CYCLE_TIME_MINS) : 0;

    const setupTimeMins = businessRules.BASE_PREP_TIME_MINS + bindingSetupMins;
    const totalProductionTimeMins = setupTimeMins + printingTimeMins + laminatingTimeMins + bindingTimeMins + trimmingTimeMins;
    const wastageTimeMins = totalProductionTimeMins * businessRules.WASTAGE_FACTOR;
    const totalTimeMins = totalProductionTimeMins + wastageTimeMins;
    const productionTimeHours = totalTimeMins / 60;
    const laborCost = productionTimeHours * laborRate;

    const subtotal = totalMaterialCost + totalPrintCost + laminationCost + laborCost;
    const markupAmount = subtotal * (markupPercent / 100);

    const totalCost = subtotal + markupAmount;

    return {
      totalPrice: totalCost,
      productionTimeHours,
      spineWidthInches: finalSpineWidth, // Return the final spine width
      
      // NEW: Verbose Calculation Details
      calculationDetails: {
          bwPaperThicknessInches: bwPaperThickness,
          colorPaperThicknessInches: colorPaperThickness,
          internalSpineInches: internalSpineInches,
          coverSpineAllowanceInches: coverSpineAllowanceInches,
          totalMaterialCost: totalMaterialCost,
          totalPrintCost: totalPrintCost,
      }
    };
  };

  const addBusinessDays = (startDate: Date, days: number) => {
    let currentDate = new Date(startDate);
    let addedDays = 0;
    while (addedDays < days) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
        addedDays++;
      }
    }
    return currentDate;
  };

  const result = await calculateCosts(specs);

  const productionDays = Math.ceil(result.productionTimeHours / 8);
  const totalBusinessDays = productionDays + 3; // 3-day shipping stub
  const estimatedDeliveryDate = addBusinessDays(new Date(), totalBusinessDays);

  return {
    totalPrice: result.totalPrice,
    estimatedDeliveryDate: estimatedDeliveryDate.toISOString(),
    spineWidthInches: result.spineWidthInches,
    // FIX: Include the new verbose details object
    calculationDetails: result.calculationDetails, 
  };
});