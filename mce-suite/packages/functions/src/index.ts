import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { JobDetails, PaperStock, PrintColor } from './types';

initializeApp();
const db = getFirestore();

export const getDynamicPrice = onCall(async (request) => {
  const { data: specs } = request;

  if (!specs) {
    throw new HttpsError('invalid-argument', 'The function must be called with one argument "specs".');
  }

  const businessRulesDoc = await db.collection('config').doc('business_rules').get();
  if (!businessRulesDoc.exists) {
    throw new HttpsError('not-found', 'Business rules not found.');
  }
  const businessRules = businessRulesDoc.data();

  const {
    laborRate = businessRules.defaultLaborRate,
    markupPercent = businessRules.defaultMarkupPercent,
    spoilagePercent = businessRules.defaultSpoilagePercent,
  } = businessRules;

  const calculateImposition = (parentW, parentH, jobW, jobH) => {
    if (jobW <= 0 || jobH <= 0) return 0;
    const fit1 = Math.floor(parentW / jobW) * Math.floor(parentH / jobH);
    const fit2 = Math.floor(parentW / jobH) * Math.floor(parentH / jobW);
    return Math.max(fit1, fit2);
  };

  const getPaperThicknessInches = (paper) => {
    const caliperFactor = paper.type === 'Coated' ? 0.9 : 1.3;
    const caliperMicrons = paper.gsm * caliperFactor;
    return caliperMicrons / 25400;
  };

  const calculateSingleBookWeightLbs = (details, bwPaper, colorPaper, coverPaper, spineWidth) => {
    let totalWeightGrams = 0;
    const { finishedWidth, finishedHeight, bwPages, colorPages, hasCover } = details;

    if (bwPaper && bwPages > 0) {
        const bwSheetAreaSqIn = finishedWidth * finishedHeight;
        const totalBwPaperAreaSqM = (bwPages / 2) * bwSheetAreaSqIn * businessRules.SQ_INCH_TO_SQ_METER;
        totalWeightGrams += totalBwPaperAreaSqM * bwPaper.gsm;
    }

    if (colorPaper && colorPages > 0) {
        const colorSheetAreaSqIn = finishedWidth * finishedHeight;
        const totalColorPaperAreaSqM = (colorPages / 2) * colorSheetAreaSqIn * businessRules.SQ_INCH_TO_SQ_METER;
        totalWeightGrams += totalColorPaperAreaSqM * colorPaper.gsm;
    }

    if (hasCover && coverPaper && spineWidth !== undefined) {
        const coverSpreadWidth = (finishedWidth * 2) + spineWidth;
        const coverAreaSqIn = coverSpreadWidth * finishedHeight;
        const coverAreaSqM = coverAreaSqIn * businessRules.SQ_INCH_TO_SQ_METER;
        totalWeightGrams += coverAreaSqM * coverPaper.gsm;
    }

    return totalWeightGrams * businessRules.GRAMS_TO_LBS;
  };

  const calculateCosts = async (details) => {
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

    const bwPaper = bwPaperDoc?.exists ? bwPaperDoc.data() : null;
    const colorPaper = colorPaperDoc?.exists ? colorPaperDoc.data() : null;
    const coverPaper = coverPaperDoc?.exists ? coverPaperDoc.data() : null;

    const totalInteriorPages = (bwPages > 0 ? bwPages : 0) + (colorPages > 0 ? colorPages : 0);
    if (bindingMethod === 'saddleStitch' && totalInteriorPages > 0 && totalInteriorPages % 4 !== 0) {
      throw new HttpsError('invalid-argument', 'Saddle stitch requires the total interior page count to be a multiple of 4.');
    }

    const spoilageMultiplier = 1 + ((spoilagePercent || 0) / 100);

    const bwImposition = bwPaper ? calculateImposition(bwPaper.parentWidth, bwPaper.parentHeight, finishedWidth, finishedHeight) : 0;
    const colorImposition = colorPaper ? calculateImposition(colorPaper.parentWidth, colorPaper.parentHeight, finishedWidth, finishedHeight) : 0;

    let coverImposition = 0;
    let spineWidth = 0;
    if (hasCover && coverPaper) {
      if (bindingMethod === 'perfectBound') {
        const bwLeaves = Math.ceil((bwPages > 0 ? bwPages : 0) / 2);
        const colorLeaves = Math.ceil((colorPages > 0 ? colorPages : 0) / 2);

        const bwPaperThickness = (bwPaper && bwPages > 0) ? getPaperThicknessInches(bwPaper) : 0;
        const colorPaperThickness = (colorPaper && colorPages > 0) ? getPaperThicknessInches(colorPaper) : 0;

        spineWidth = (bwLeaves * bwPaperThickness) + (colorLeaves * colorPaperThickness);
      }
      const coverSpreadWidth = (finishedWidth * 2) + spineWidth;
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

    const subtotal = (bwPaperCost + colorPaperCost + coverPaperCost) + (bwClickCost + colorClickCost + coverClickCost) + laminationCost + laborCost;
    const markupAmount = subtotal * (markupPercent / 100);

    const totalCost = subtotal + markupAmount;

    return {
      totalPrice: totalCost,
      productionTimeHours,
      spineWidthInches: spineWidth,
    };
  };

  const addBusinessDays = (startDate, days) => {
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
  };
});
