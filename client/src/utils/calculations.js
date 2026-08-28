export const PLY_CONFIG = {
  3: { paper: 2, flute: 1 },
  5: { paper: 3, flute: 2 },
  7: { paper: 4, flute: 3 },
  9: { paper: 5, flute: 4 },
  11: { paper: 6, flute: 5 },
  13: { paper: 7, flute: 6 },
};

// Helper to convert dimensions to inches if given in mm (1 inch = 25.4 mm)
export function convertToInches(val, unit = 'inches') {
  const num = Number(val) || 0;
  if (unit && unit.toLowerCase() === 'mm') {
    return num / 25.4;
  }
  return num;
}

// Identifier prefix used to tag pad calculations in customer_name
export const PAD_CALC_PREFIX = '[Pad]';

// Identifier prefix used to tag partition calculations in customer_name
export const PARTITION_CALC_PREFIX = '[Partition]';

// Identifier prefix used to tag full closing box calculations in customer_name
export const FULL_CLOSING_BOX_CALC_PREFIX = '[FullClosingBox]';


/**
 * Calculates all metrics for a corrugated box setup.
 */
export function calculateBoxPricing({
  L,
  W,
  H,
  qtyBoxes,
  plyType,
  fluteExtraPercent,
  pricePerKg,
  qtyData,
  gstPercent,
  reelSizeAdjust = 0,
  cutSizeAdjust = 0,
  gsmPaper = 150,
  gsmFlute = 150,
  gsmPacking = 150,
  isDuplex = false,
  duplexPrice = 0,
  isLaminated = false,
  laminationRupees = 0,
  isPrintingCharge = false,
  printingLabourCharge = 0,
  printingPlatePrice = 0,
  printingNoOfPlates = 0,
  isInkCost = false,
  inkPricePerBox = 0,
  isScreenPrinting = false,
  screenPrintingPricePerBox = 0,
  isCallicoCost = false,
  callicoPricePerBox = 0
}) {
  const plies = PLY_CONFIG[plyType];
  if (!plies) {
    throw new Error(`Unsupported ply type: ${plyType}`);
  }

  const paperPlies = plies.paper;
  const flutePlies = plies.flute;

  // 1. Reel Size = W + H + 1 + reelSizeAdjust
  const reelSize = W + H + 1 + Number(reelSizeAdjust);

  // 2. Cut Size = L + W + 2 + cutSizeAdjust
  const cutSize = L + W + 2 + Number(cutSizeAdjust);

  // 4. Flute calculation (same for both normal and duplex)
  const flute = ((Number(gsmFlute) * (fluteExtraPercent / 100)) + Number(gsmFlute)) * flutePlies;

  if (isDuplex) {
    // ═══════════════════════════════════════════════════════════════════════════
    // DUPLEX MODE: Two separate calculations
    // ═══════════════════════════════════════════════════════════════════════════
    //
    // PART 1 (Kraft): Normal papers (excluding packing paper) + Flute → priced at normal pricePerKg
    //   e.g. for 5 ply (3 paper, 2 flute): (2 normal papers × 150 GSM) + 435 flute = 735
    //
    // PART 2 (Duplex): 230 GSM duplex paper + Flute → priced at duplexPrice per KG
    //   e.g. 230 + 435 = 665

    // --- PART 1: Kraft (normal papers + flute) ---
    const kraftPaperGSM = (paperPlies - 1) * Number(gsmPaper);  // normal papers only, no packing paper
    const kraftTotalGSM = kraftPaperGSM + flute;
    const kraftWeightPerUnit = (reelSize * cutSize * kraftTotalGSM) / 1550000;
    const kraftBoxWeight = kraftWeightPerUnit * Number(qtyData);
    const kraftSingleBoxPrice = kraftBoxWeight * Number(pricePerKg);

    // --- PART 2: Duplex (230 GSM duplex paper only, no flute) ---
    const duplexPaperGSM = 230;
    const duplexTotalGSM = duplexPaperGSM;
    const duplexWeightPerUnit = (reelSize * cutSize * duplexTotalGSM) / 1550000;
    const duplexBoxWeight = duplexWeightPerUnit * Number(qtyData);
    const duplexSingleBoxPrice = duplexBoxWeight * Number(duplexPrice);

    // --- Combined (for compatibility) ---
    const singleBoxPrice = kraftSingleBoxPrice + duplexSingleBoxPrice;

    // For display: show combined paper + flute values
    const paper = kraftPaperGSM + duplexPaperGSM; // total paper GSM across both parts
    const totalPF = paper + flute; // display total (note: flute counted once for display)
    const weightPerUnit = kraftWeightPerUnit + duplexWeightPerUnit;
    const boxWeight = kraftBoxWeight + duplexBoxWeight;

    // Kraft subtotal and Duplex subtotal (for separate display)
    const kraftBoxCost = kraftSingleBoxPrice * Number(qtyBoxes);
    const duplexBoxCost = duplexSingleBoxPrice * Number(qtyBoxes);

    // Total Cost = singleBoxPrice × Quantity of Boxes
    const totalCost = singleBoxPrice * qtyBoxes;

    // Lamination
    const laminationSingleBoxPrice = isLaminated 
      ? (reelSize * cutSize * Number(laminationRupees) * Number(qtyData)) 
      : 0;
    const laminationBoxCost = laminationSingleBoxPrice * Number(qtyBoxes);

    // Printing Charge
    const printingCharge = isPrintingCharge 
      ? (Number(printingLabourCharge) + (Number(printingPlatePrice) * Number(printingNoOfPlates)))
      : 0;
    const singleBoxPrintingCharge = isPrintingCharge && Number(qtyBoxes) > 0 
      ? printingCharge / Number(qtyBoxes) 
      : 0;
    const printingBoxCost = printingCharge;

    // Ink Cost
    const inkSingleBoxPrice = isInkCost ? Number(inkPricePerBox) : 0;
    const inkBoxCost = inkSingleBoxPrice * Number(qtyBoxes);

    // Screen Printing Cost
    const screenPrintingSingleBoxPrice = isScreenPrinting ? Number(screenPrintingPricePerBox) : 0;
    const screenPrintingBoxCost = screenPrintingSingleBoxPrice * Number(qtyBoxes);

    // Callico Cost
    const callicoSingleBoxPrice = isCallicoCost ? Number(callicoPricePerBox) : 0;
    const callicoBoxCost = callicoSingleBoxPrice * Number(qtyBoxes);

    // Add ALL costs first, then apply GST
    const allCostsBeforeGST = totalCost + laminationBoxCost + printingBoxCost + inkBoxCost + screenPrintingBoxCost + callicoBoxCost;
    const gstAmount = allCostsBeforeGST * (gstPercent / 100);

    // Grand Total = all costs + GST
    const grandTotal = allCostsBeforeGST + gstAmount;

    return {
      reelSize,
      cutSize,
      paper,
      flute,
      totalPF,
      weightPerUnit,
      boxWeight,
      singleBoxPrice,
      totalCost,
      gstAmount,
      grandTotal,
      isDuplex: true,
      // Kraft part details (for display)
      kraftPaperGSM,
      kraftTotalGSM,
      kraftWeightPerUnit,
      kraftBoxWeight,
      kraftSingleBoxPrice,
      // Kraft subtotal for display
      kraftBoxCost,
      // Duplex part details (for display)
      duplexPaperGSM,
      duplexTotalGSM,
      duplexWeightPerUnit,
      duplexBoxWeight,
      duplexSingleBoxPrice,
      duplexBoxCost,
      // All costs before GST (for display)
      allCostsBeforeGST,
      isLaminated,
      laminationSingleBoxPrice,
      laminationBoxCost,
      isPrintingCharge,
      printingLabourCharge: Number(printingLabourCharge),
      printingPlatePrice: Number(printingPlatePrice),
      printingNoOfPlates: Number(printingNoOfPlates),
      printingCharge,
      singleBoxPrintingCharge,
      printingBoxCost,
      isInkCost,
      inkSingleBoxPrice,
      inkBoxCost,
      isScreenPrinting,
      screenPrintingSingleBoxPrice,
      screenPrintingBoxCost,
      isCallicoCost,
      callicoSingleBoxPrice,
      callicoBoxCost
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMAL MODE (no duplex): Standard calculation unchanged
  // ═══════════════════════════════════════════════════════════════════════════

  // 3. Paper calculation
  const paper = ((paperPlies - 1) * Number(gsmPaper)) + Number(gsmPacking);
  const totalPF = paper + flute;
  const weightPerUnit = (reelSize * cutSize * totalPF) / 1550000;
  const boxWeight = weightPerUnit * qtyData;

  // Single Box Price = boxWeight * pricePerKg
  const singleBoxPrice = boxWeight * Number(pricePerKg);

  // Total Cost = Single Box Price * Quantity of Boxes
  const totalCost = singleBoxPrice * qtyBoxes;

  // Lamination single box price = (reel size * cut size) * rupees * quantity of data
  const laminationSingleBoxPrice = isLaminated 
    ? (reelSize * cutSize * Number(laminationRupees) * Number(qtyData)) 
    : 0;
  const laminationBoxCost = laminationSingleBoxPrice * Number(qtyBoxes);

  // Printing Charge calculation: (Labour Charge) + (Plate Price * No of Plates)
  const printingCharge = isPrintingCharge 
    ? (Number(printingLabourCharge) + (Number(printingPlatePrice) * Number(printingNoOfPlates)))
    : 0;
  const singleBoxPrintingCharge = isPrintingCharge && Number(qtyBoxes) > 0 
    ? printingCharge / Number(qtyBoxes) 
    : 0;
  const printingBoxCost = printingCharge;

  // Ink Cost calculation
  const inkSingleBoxPrice = isInkCost ? Number(inkPricePerBox) : 0;
  const inkBoxCost = inkSingleBoxPrice * Number(qtyBoxes);

  // Screen Printing Cost calculation
  const screenPrintingSingleBoxPrice = isScreenPrinting ? Number(screenPrintingPricePerBox) : 0;
  const screenPrintingBoxCost = screenPrintingSingleBoxPrice * Number(qtyBoxes);

  // Callico Cost calculation
  const callicoSingleBoxPrice = isCallicoCost ? Number(callicoPricePerBox) : 0;
  const callicoBoxCost = callicoSingleBoxPrice * Number(qtyBoxes);

  // Add ALL costs first, then apply GST
  const allCostsBeforeGST = totalCost + laminationBoxCost + printingBoxCost + inkBoxCost + screenPrintingBoxCost + callicoBoxCost;
  const gstAmount = allCostsBeforeGST * (gstPercent / 100);

  // Grand Total = all costs + GST
  const grandTotal = allCostsBeforeGST + gstAmount;

  return {
    reelSize,
    cutSize,
    paper,
    flute,
    totalPF,
    weightPerUnit,
    boxWeight,
    singleBoxPrice,
    totalCost,
    gstAmount,
    grandTotal,
    isDuplex: false,
    duplexSingleBoxPrice: 0,
    duplexBoxCost: 0,
    isLaminated,
    laminationSingleBoxPrice,
    laminationBoxCost,
    isPrintingCharge,
    printingLabourCharge: Number(printingLabourCharge),
    printingPlatePrice: Number(printingPlatePrice),
    printingNoOfPlates: Number(printingNoOfPlates),
    printingCharge,
    singleBoxPrintingCharge,
    printingBoxCost,
    isInkCost,
    inkSingleBoxPrice,
    inkBoxCost,
    isScreenPrinting,
    screenPrintingSingleBoxPrice,
    screenPrintingBoxCost,
    isCallicoCost,
    callicoSingleBoxPrice,
    callicoBoxCost
  };
}

/**
 * Calculates all metrics for a corrugated pad (flat sheet â€“ no height dimension).
 * Reel Size = W + 0.5, Cut Size = L + 0.5 (no fold-over for height).
 */
export function calculatePadPricing({
  L,
  W,
  qtyPads,
  plyType,
  fluteExtraPercent,
  pricePerKg,
  qtyData,
  gstPercent,
  reelSizeAdjust = 0,
  cutSizeAdjust = 0,
  gsmPaper = 150,
  gsmFlute = 150,
  gsmPacking = 150
}) {
  const plies = PLY_CONFIG[plyType];
  if (!plies) {
    throw new Error(`Unsupported ply type: ${plyType}`);
  }

  const paperPlies = plies.paper;
  const flutePlies = plies.flute;

  // 1. Reel Size = W + 0.5 + reelSizeAdjust  (no height for pads)
  const reelSize = W + 0.5 + Number(reelSizeAdjust);

  // 2. Cut Size = L + 0.5 + cutSizeAdjust
  const cutSize = L + 0.5 + Number(cutSizeAdjust);

  // 3. Paper GSM = ((paperPlies - 1) * gsmPaper) + (1 * gsmPacking)
  const paper = ((paperPlies - 1) * Number(gsmPaper)) + (1 * Number(gsmPacking));

  // 4. Flute GSM = ((gsmFlute * fluteExtraPercent/100) + gsmFlute) * flutePlies
  const flute = ((Number(gsmFlute) * (fluteExtraPercent / 100)) + Number(gsmFlute)) * flutePlies;

  // 5. Total P+F
  const totalPF = paper + flute;

  // 6. Weight per pad = (Reel Size * Cut Size * P+F) / 1,550,000
  const weightPerUnit = (reelSize * cutSize * totalPF) / 1550000;

  // 7. Pad Weight = Weight per unit
  const padWeight = weightPerUnit;

  // 8. Single Pad Price = Pad Weight * Price per kg
  const singlePadPrice = padWeight * pricePerKg;

  // 9. Total Cost = Single Pad Price * Quantity of Pads
  const totalCost = singlePadPrice * qtyPads;

  // 10. GST amount
  const gstAmount = totalCost * (gstPercent / 100);

  // 11. Grand Total
  const grandTotal = totalCost + gstAmount;

  return {
    reelSize,
    cutSize,
    paper,
    flute,
    totalPF,
    weightPerUnit,
    padWeight,
    singlePadPrice,
    totalCost,
    gstAmount,
    grandTotal
  };
}

/**
 * Calculates all metrics for a corrugated partition.
 * Unlike pad, partition uses NO default +0.5 adjustment:
 *   Reel Size = W + reelSizeAdjust
 *   Cut Size  = L + cutSizeAdjust
 */
export function calculatePartitionPricing({
  L,
  W,
  qtyPads,
  plyType,
  fluteExtraPercent,
  pricePerKg,
  qtyData,
  gstPercent,
  reelSizeAdjust = 0,
  cutSizeAdjust = 0,
  gsmPaper = 150,
  gsmFlute = 150,
  gsmPacking = 150
}) {
  const plies = PLY_CONFIG[plyType];
  if (!plies) throw new Error(`Unsupported ply type: ${plyType}`);

  const paperPlies = plies.paper;
  const flutePlies = plies.flute;

  const reelSize = W + Number(reelSizeAdjust);
  const cutSize = L + Number(cutSizeAdjust);

  const paper = ((paperPlies - 1) * Number(gsmPaper)) + (1 * Number(gsmPacking));
  const flute = ((Number(gsmFlute) * (fluteExtraPercent / 100)) + Number(gsmFlute)) * flutePlies;
  const totalPF = paper + flute;

  const weightPerUnit = (reelSize * cutSize * totalPF) / 1550000;
  const padWeight = weightPerUnit;
  const singlePadPrice = padWeight * pricePerKg;
  const totalCost = singlePadPrice * qtyPads;
  const gstAmount = totalCost * (gstPercent / 100);
  const grandTotal = totalCost + gstAmount;

  return {
    reelSize, cutSize, paper, flute, totalPF,
    weightPerUnit, padWeight, singlePadPrice,
    totalCost, gstAmount, grandTotal
  };
}

/**
 * Calculates pricing for paired partitions (two sizes grouped as one option).
 * Each partition's box weight = set × (OTHER partition's slot count) × weight per unit.
 * Reel Size = W (no +0.5), Cut Size = L (no +0.5).
 */
export function calculatePairedPartitionPricing({
  first,        // { L, W, slotCount }
  second,       // { L, W, slotCount }
  set,
  qtyPads,
  plyType,
  fluteExtraPercent,
  pricePerKg,
  gstPercent,
  reelSizeAdjust = 0,
  cutSizeAdjust = 0,
  gsmPaper = 150,
  gsmFlute = 150,
  gsmPacking = 150
}) {
  const plies = PLY_CONFIG[plyType];
  if (!plies) throw new Error(`Unsupported ply type: ${plyType}`);

  const paperPlies = plies.paper;
  const flutePlies = plies.flute;

  const paper = ((paperPlies - 1) * Number(gsmPaper)) + (1 * Number(gsmPacking));
  const flute = ((Number(gsmFlute) * (fluteExtraPercent / 100)) + Number(gsmFlute)) * flutePlies;
  const totalPF = paper + flute;

  // First partition: Width→Reel, Length→Cut
  const firstReelSize = first.W + Number(reelSizeAdjust);
  const firstCutSize = first.L + Number(cutSizeAdjust);
  const firstWeightPerUnit = (firstReelSize * firstCutSize * totalPF) / 1550000;
  // Box weight uses SECOND partition's slot count
  const firstBoxWeight = Number(set) * second.slotCount * firstWeightPerUnit;
  const firstPrice = firstBoxWeight * Number(pricePerKg);

  // Second partition: Width→Reel, Length→Cut
  const secondReelSize = second.W + Number(reelSizeAdjust);
  const secondCutSize = second.L + Number(cutSizeAdjust);
  const secondWeightPerUnit = (secondReelSize * secondCutSize * totalPF) / 1550000;
  // Box weight uses FIRST partition's slot count
  const secondBoxWeight = Number(set) * first.slotCount * secondWeightPerUnit;
  const secondPrice = secondBoxWeight * Number(pricePerKg);

  // Combined
  const singleSetPrice = firstPrice + secondPrice;
  const totalCost = singleSetPrice * Number(qtyPads);
  const gstAmount = totalCost * (gstPercent / 100);
  const grandTotal = totalCost + gstAmount;

  return {
    paper, flute, totalPF,
    first: {
      reelSize: firstReelSize,
      cutSize: firstCutSize,
      weightPerUnit: firstWeightPerUnit,
      boxWeight: firstBoxWeight,
      price: firstPrice,
      slotCount: first.slotCount,
      usedSlot: second.slotCount
    },
    second: {
      reelSize: secondReelSize,
      cutSize: secondCutSize,
      weightPerUnit: secondWeightPerUnit,
      boxWeight: secondBoxWeight,
      price: secondPrice,
      slotCount: second.slotCount,
      usedSlot: first.slotCount
    },
    singleSetPrice,
    totalCost,
    gstAmount,
    grandTotal
  };
}

// Identifier prefix used to tag tray calculations in customer_name
export const TRAY_CALC_PREFIX = '[Tray]';

/**
 * Calculates all metrics for a corrugated tray.
 * Reel Size = W + H + H + 1, Cut Size = L + H + H + 1.
 */
export function calculateTrayPricing({
  L,
  W,
  H,
  qtyTrays,
  plyType,
  fluteExtraPercent,
  pricePerKg,
  qtyData,
  gstPercent,
  reelSizeAdjust = 0,
  cutSizeAdjust = 0,
  gsmPaper = 150,
  gsmFlute = 150,
  gsmPacking = 150
}) {
  const plies = PLY_CONFIG[plyType];
  if (!plies) {
    throw new Error(`Unsupported ply type: ${plyType}`);
  }

  const paperPlies = plies.paper;
  const flutePlies = plies.flute;

  // 1. Reel Size = W + H + H + 1 + reelSizeAdjust
  const reelSize = W + H + H + 1 + Number(reelSizeAdjust);

  // 2. Cut Size = L + H + H + 1 + cutSizeAdjust
  const cutSize = L + H + H + 1 + Number(cutSizeAdjust);

  // 3. Paper = ((paperPlies - 1) * gsmPaper) + (1 * gsmPacking)
  const paper = ((paperPlies - 1) * Number(gsmPaper)) + (1 * Number(gsmPacking));

  // 4. Flute = ((gsmFlute * fluteExtraPercent/100) + gsmFlute) * flutePlies
  const flute = ((Number(gsmFlute) * (fluteExtraPercent / 100)) + Number(gsmFlute)) * flutePlies;

  // 5. Total P+F
  const totalPF = paper + flute;

  // 6. Weight per unit = (Reel Size * Cut Size * (P+F)) / 1,550,000
  const weightPerUnit = (reelSize * cutSize * totalPF) / 1550000;

  // 7. Tray Weight = Weight per unit
  const trayWeight = weightPerUnit;

  // 8. Single Tray Price = Tray Weight * Price per kg
  const singleTrayPrice = trayWeight * pricePerKg;

  // 9. Total Cost = Single Tray Price * Quantity of Trays
  const totalCost = singleTrayPrice * qtyTrays;

  // 10. GST amount
  const gstAmount = totalCost * (gstPercent / 100);

  // 11. Grand Total
  const grandTotal = totalCost + gstAmount;

  return {
    reelSize,
    cutSize,
    paper,
    flute,
    totalPF,
    weightPerUnit,
    trayWeight,
    singleTrayPrice,
    totalCost,
    gstAmount,
    grandTotal
  };
}

// Identifier prefix used to tag sleave calculations in customer_name
export const SLEAVE_CALC_PREFIX = '[Sleave]';

// Identifier prefix used to tag coller box calculations in customer_name
export const COLLER_BOX_CALC_PREFIX = '[CollerBox]';

/**
 * Calculates all metrics for a Sleave.
 */
export function calculateSleavePricing({
  L = 0,
  W = 0,
  H = 0,
  flabL = 0,
  flabW = 0,
  qtyBoxes = 1,
  plyType = 5,
  fluteExtraPercent = 45,
  pricePerKg = 60,
  qtyData = 2,
  gstPercent = 18,
  reelSizeAdjust = 0,
  cutSizeAdjust = 0,
  gsmPaper = 150,
  gsmFlute = 150,
  gsmPacking = 150,
  isScreenPrinting = false,
  screenPrintingPricePerBox = 0,
  isCallicoCost = false,
  callicoPricePerBox = 0
}) {
  const plies = PLY_CONFIG[plyType];
  if (!plies) {
    throw new Error(`Unsupported ply type: ${plyType}`);
  }

  const paperPlies = plies.paper;
  const flutePlies = plies.flute;

  // 1. Calculated dimensions (with flab and 1-inch waste)
  const calcLength = L + Number(flabL) + 1;   // Given length + flab + 1 inch waste
  const calcWidth  = W + Number(flabW) + 1;   // Given width  + flab + 1 inch waste
  const calcHeight = H + 1 + Number(reelSizeAdjust);  // Reel size = H + 1 inch waste

  // 2. Cut size (length direction, with optional cutSizeAdjust)
  //    Using calcLength + calcWidth + 2 pattern (same fold logic as box)
  const reelSize = calcWidth  + Number(reelSizeAdjust === 0 ? 0 : 0); // already folded into calcHeight
  const cutSize  = calcLength + Number(cutSizeAdjust);

  // 3. Paper & Flute GSM
  const paper = ((paperPlies - 1) * Number(gsmPaper)) + (1 * Number(gsmPacking));
  const flute = ((Number(gsmFlute) * (fluteExtraPercent / 100)) + Number(gsmFlute)) * flutePlies;
  const totalPF = paper + flute;

  // 4. Weight per unit for each side group
  //    Length sides area = calcLength × calcHeight × 2
  const lengthSideArea = calcLength * calcHeight * 2;
  //    Width sides area  = calcWidth  × calcHeight × 2
  const widthSideArea  = calcWidth  * calcHeight  * 2;
  //    Total area used for weight
  const totalArea = lengthSideArea + widthSideArea;

  // Calculate length and width weight separately:
  // lengthWeight = (calcHeight * calcLength * 2 * totalPF) / 1550000
  const lengthWeight = (calcHeight * calcLength * 2 * totalPF) / 1550000;
  // widthWeight = (calcHeight * calcWidth * 2 * totalPF) / 1550000
  const widthWeight = (calcHeight * calcWidth * 2 * totalPF) / 1550000;

  // 5. Weight per unit (sum of length weight and width weight)
  const weightPerUnit = lengthWeight + widthWeight;

  // 6. Tray Box Weight = weightPerUnit
  const trayBoxWeight = weightPerUnit;

  // 7. Single Tray Box Price = trayBoxWeight × pricePerKg
  const singleTrayBoxPrice = trayBoxWeight * pricePerKg;

  // 8. Total Cost = singleTrayBoxPrice × qtyBoxes
  const totalCost = singleTrayBoxPrice * qtyBoxes;

  // Screen Printing Cost calculation
  const screenPrintingSingleBoxPrice = isScreenPrinting ? Number(screenPrintingPricePerBox) : 0;
  const screenPrintingBoxCost = screenPrintingSingleBoxPrice * Number(qtyBoxes);

  // Callico Cost calculation
  const callicoSingleBoxPrice = isCallicoCost ? Number(callicoPricePerBox) : 0;
  const callicoBoxCost = callicoSingleBoxPrice * Number(qtyBoxes);

  // Add ALL costs first, then apply GST
  const allCostsBeforeGST = totalCost + screenPrintingBoxCost + callicoBoxCost;
  const gstAmount = allCostsBeforeGST * (gstPercent / 100);

  // Grand Total = all costs + GST
  const grandTotal = allCostsBeforeGST + gstAmount;

  return {
    calcLength,
    calcWidth,
    calcHeight,
    reelSize: calcHeight,   // expose as reelSize for display compatibility
    cutSize: calcLength,    // expose as cutSize for display compatibility
    lengthSideArea,
    widthSideArea,
    totalArea,
    lengthWeight,
    widthWeight,
    paper,
    flute,
    totalPF,
    weightPerUnit,
    sleaveWeight: weightPerUnit,
    singleSleavePrice: singleTrayBoxPrice,
    totalCost,
    allCostsBeforeGST,
    gstAmount,
    grandTotal,
    isScreenPrinting,
    screenPrintingSingleBoxPrice,
    screenPrintingBoxCost,
    isCallicoCost,
    callicoSingleBoxPrice,
    callicoBoxCost
  };
}

/**
 * Calculates all metrics for a Coller Box (same as sleave calculation).
 */
export function calculateCollerBoxPricing(args) {
  const res = calculateSleavePricing(args);
  return {
    ...res,
    collerBoxWeight: res.sleaveWeight,
    singleCollerBoxPrice: res.singleSleavePrice
  };
}

// Identifier prefix used to tag universal-box calculations in customer_name
export const TOP_SIDE_TRAY_BOX_CALC_PREFIX = '[TopSideTrayBox]';

/**
 * Calculates all metrics for a Top Side Tray Box.
 *
 * Top Side Tray Box differs from Tray Box only in the reel-size (height) formula:
 *  - calculatedLength = L + flabL + 1  (inch waste)
 *  - calculatedWidth  = W + flabW + 1  (inch waste)
 *  - calculatedHeight = H + (W / 2) + 1 + reelSizeAdjust  †  KEY DIFFERENCE
 *
 * Weight is calculated for each of the 4 sides separately:
 *  - 2 Length sides: calcLength × calcHeight × 2
 *  - 2 Width  sides: calcWidth  × calcHeight × 2
 * Then totalArea = lengthArea + widthArea is used for weight/price.
 */
export function calculateTopSideTrayBoxPricing({
  L,
  W,
  H,
  flabL = 0,
  flabW = 0,
  qtyBoxes,
  plyType,
  fluteExtraPercent,
  pricePerKg,
  qtyData,
  gstPercent,
  reelSizeAdjust = 0,
  cutSizeAdjust = 0,
  gsmPaper = 150,
  gsmFlute = 150,
  gsmPacking = 150,
  isScreenPrinting = false,
  screenPrintingPricePerBox = 0,
  isCallicoCost = false,
  callicoPricePerBox = 0
}) {
  const plies = PLY_CONFIG[plyType];
  if (!plies) {
    throw new Error(`Unsupported ply type: ${plyType}`);
  }

  const paperPlies = plies.paper;
  const flutePlies = plies.flute;

  // 1. Calculated dimensions (with flab and 1-inch waste)
  const calcLength = L + Number(flabL) + 1;   // Given length + flab + 1 inch waste
  const calcWidth  = W + Number(flabW) + 1;   // Given width  + flab + 1 inch waste
  // KEY DIFFERENCE from Tray Box: reel size = H + (W / 2) + 1
  const calcHeight = H + (W / 2) + 1 + Number(reelSizeAdjust);

  // 2. Cut size (with optional cutSizeAdjust)
  const cutSize  = calcLength + Number(cutSizeAdjust);

  // 3. Paper & Flute GSM
  const paper = ((paperPlies - 1) * Number(gsmPaper)) + (1 * Number(gsmPacking));
  const flute = ((Number(gsmFlute) * (fluteExtraPercent / 100)) + Number(gsmFlute)) * flutePlies;
  const totalPF = paper + flute;

  // 4. Weight per unit for each side group
  //    Length sides area = calcLength × calcHeight × 2
  const lengthSideArea = calcLength * calcHeight * 2;
  //    Width sides area  = calcWidth  × calcHeight × 2
  const widthSideArea  = calcWidth  * calcHeight  * 2;
  //    Total area used for weight
  const totalArea = lengthSideArea + widthSideArea;

  // Calculate length and width weight separately:
  // lengthWeight = (calcHeight * calcLength * 2 * totalPF) / 1550000
  const lengthWeight = (calcHeight * calcLength * 2 * totalPF) / 1550000;
  // widthWeight = (calcHeight * calcWidth * 2 * totalPF) / 1550000
  const widthWeight = (calcHeight * calcWidth * 2 * totalPF) / 1550000;

  // 5. Weight per unit (sum of length weight and width weight)
  const weightPerUnit = lengthWeight + widthWeight;

  // 6. Top Side Tray Box Weight = weightPerUnit
  const topSideTrayBoxWeight = weightPerUnit;

  // 7. Single Top Side Tray Box Price = topSideTrayBoxWeight × pricePerKg
  const singleTopSideTrayBoxPrice = topSideTrayBoxWeight * pricePerKg;

  // 8. Total Cost = singleTopSideTrayBoxPrice × qtyBoxes
  const totalCost = singleTopSideTrayBoxPrice * qtyBoxes;

  // Screen Printing Cost calculation
  const screenPrintingSingleBoxPrice = isScreenPrinting ? Number(screenPrintingPricePerBox) : 0;
  const screenPrintingBoxCost = screenPrintingSingleBoxPrice * Number(qtyBoxes);

  // Callico Cost calculation
  const callicoSingleBoxPrice = isCallicoCost ? Number(callicoPricePerBox) : 0;
  const callicoBoxCost = callicoSingleBoxPrice * Number(qtyBoxes);

  // Add ALL costs first, then apply GST
  const allCostsBeforeGST = totalCost + screenPrintingBoxCost + callicoBoxCost;
  const gstAmount = allCostsBeforeGST * (gstPercent / 100);

  // Grand Total = all costs + GST
  const grandTotal = allCostsBeforeGST + gstAmount;

  return {
    calcLength,
    calcWidth,
    calcHeight,
    reelSize: calcHeight,   // expose as reelSize for display compatibility
    cutSize: calcLength,    // expose as cutSize for display compatibility
    lengthSideArea,
    widthSideArea,
    totalArea,
    lengthWeight,
    widthWeight,
    paper,
    flute,
    totalPF,
    weightPerUnit,
    topSideTrayBoxWeight,
    singleTopSideTrayBoxPrice,
    totalCost,
    allCostsBeforeGST,
    gstAmount,
    grandTotal,
    isScreenPrinting,
    screenPrintingSingleBoxPrice,
    screenPrintingBoxCost,
    isCallicoCost,
    callicoSingleBoxPrice,
    callicoBoxCost
  };
}

// Identifier prefix used to tag universal-type calculations in customer_name
export const UNIVERSAL_TYPE_CALC_PREFIX = '[UniversalType]';

/**
 * Calculates all metrics for a Universal Type box.
 *
 * Similar to Tray but with swapped L/W in reel/cut formulas
 * and separate Top + Bottom weight calculations:
 *  - Reel Size = L + H + H + 1 (inch waste)   ← uses L (Tray uses W)
 *  - Cut Size  = W + H + H + 1 (inch waste)   ← uses W (Tray uses L)
 *
 * Weight is calculated separately for Top and Bottom:
 *  - Top:    (reelSize + 0.5) × (cutSize + 0.5) × totalPF / 1,550,000
 *  - Bottom: reelSize × cutSize × totalPF / 1,550,000
 * 1 Top + 1 Bottom = 1 single box.
 */
export function calculateUniversalTypePricing({
  L,
  W,
  H,
  qtyBoxes,
  plyType,
  fluteExtraPercent,
  pricePerKg,
  qtyData,
  gstPercent,
  reelSizeAdjust = 0,
  cutSizeAdjust = 0,
  gsmPaper = 150,
  gsmFlute = 150,
  gsmPacking = 150,
  isScreenPrinting = false,
  screenPrintingPricePerBox = 0,
  isCallicoCost = false,
  callicoPricePerBox = 0
}) {
  const plies = PLY_CONFIG[plyType];
  if (!plies) {
    throw new Error(`Unsupported ply type: ${plyType}`);
  }

  const paperPlies = plies.paper;
  const flutePlies = plies.flute;

  // 1. Reel Size = L + H + H + 1 + reelSizeAdjust  (note: L, not W)
  const reelSize = L + H + H + 1 + Number(reelSizeAdjust);

  // 2. Cut Size = W + H + H + 1 + cutSizeAdjust  (note: W, not L)
  const cutSize = W + H + H + 1 + Number(cutSizeAdjust);

  // 3. Paper = ((paperPlies - 1) * gsmPaper) + (1 * gsmPacking)
  const paper = ((paperPlies - 1) * Number(gsmPaper)) + (1 * Number(gsmPacking));

  // 4. Flute = ((gsmFlute * fluteExtraPercent/100) + gsmFlute) * flutePlies
  const flute = ((Number(gsmFlute) * (fluteExtraPercent / 100)) + Number(gsmFlute)) * flutePlies;

  // 5. Total P+F
  const totalPF = paper + flute;

  // 6. Top Weight = (reelSize + 0.5) * (cutSize + 0.5) * totalPF / 1,550,000
  //    Extra 0.5 inch added to BOTH reel and cut for the top only
  const topWeight = ((reelSize + 0.5) * (cutSize + 0.5) * totalPF) / 1550000;

  // 7. Bottom Weight = reelSize * cutSize * totalPF / 1,550,000
  //    No extra — uses raw reel/cut sizes
  const bottomWeight = (reelSize * cutSize * totalPF) / 1550000;

  // 8. Weight per unit = topWeight + bottomWeight (1 top + 1 bottom = 1 box)
  const weightPerUnit = topWeight + bottomWeight;

  // 9. Universal Type Weight = weightPerUnit (no qtyData multiplication)
  const universalTypeWeight = weightPerUnit;

  // 10. Single Universal Type Price = universalTypeWeight * pricePerKg
  const singleUniversalTypePrice = universalTypeWeight * pricePerKg;

  // 11. Total Cost = singleUniversalTypePrice * qtyBoxes
  const totalCost = singleUniversalTypePrice * qtyBoxes;

  // Screen Printing Cost calculation
  const screenPrintingSingleBoxPrice = isScreenPrinting ? Number(screenPrintingPricePerBox) : 0;
  const screenPrintingBoxCost = screenPrintingSingleBoxPrice * Number(qtyBoxes);

  // Callico Cost calculation
  const callicoSingleBoxPrice = isCallicoCost ? Number(callicoPricePerBox) : 0;
  const callicoBoxCost = callicoSingleBoxPrice * Number(qtyBoxes);

  // Add ALL costs first, then apply GST
  const allCostsBeforeGST = totalCost + screenPrintingBoxCost + callicoBoxCost;
  const gstAmount = allCostsBeforeGST * (gstPercent / 100);

  // Grand Total = all costs + GST
  const grandTotal = allCostsBeforeGST + gstAmount;

  return {
    reelSize,
    cutSize,
    paper,
    flute,
    totalPF,
    topWeight,
    bottomWeight,
    weightPerUnit,
    universalTypeWeight,
    singleUniversalTypePrice,
    totalCost,
    allCostsBeforeGST,
    gstAmount,
    grandTotal,
    isScreenPrinting,
    screenPrintingSingleBoxPrice,
    screenPrintingBoxCost,
    isCallicoCost,
    callicoSingleBoxPrice,
    callicoBoxCost
  };
}

/**
 * Calculates all metrics for a corrugated full closing box setup.
 * Same as box calculation, except the reel size has a 6-inch waste instead of 1-inch waste.
 */
export function calculateFullClosingBoxPricing({
  L,
  W,
  H,
  qtyBoxes,
  plyType,
  fluteExtraPercent,
  pricePerKg,
  qtyData,
  gstPercent,
  reelSizeAdjust = 0,
  cutSizeAdjust = 0,
  gsmPaper = 150,
  gsmFlute = 150,
  gsmPacking = 150,
  isDuplex = false,
  duplexPrice = 0,
  isLaminated = false,
  laminationRupees = 0,
  isPrintingCharge = false,
  printingLabourCharge = 0,
  printingPlatePrice = 0,
  printingNoOfPlates = 0,
  isInkCost = false,
  inkPricePerBox = 0,
  isScreenPrinting = false,
  screenPrintingPricePerBox = 0,
  isCallicoCost = false,
  callicoPricePerBox = 0
}) {
  const plies = PLY_CONFIG[plyType];
  if (!plies) {
    throw new Error(`Unsupported ply type: ${plyType}`);
  }

  const paperPlies = plies.paper;
  const flutePlies = plies.flute;

  // 1. Reel Size = W + H + 6 + reelSizeAdjust
  const reelSize = W + H + 6 + Number(reelSizeAdjust);

  // 2. Cut Size = L + W + 2 + cutSizeAdjust
  const cutSize = L + W + 2 + Number(cutSizeAdjust);

  // 4. Flute calculation (same for both normal and duplex)
  const flute = ((Number(gsmFlute) * (fluteExtraPercent / 100)) + Number(gsmFlute)) * flutePlies;

  if (isDuplex) {
    // Kraft part
    const kraftPaperGSM = (paperPlies - 1) * Number(gsmPaper);
    const kraftTotalGSM = kraftPaperGSM + flute;
    const kraftWeightPerUnit = (reelSize * cutSize * kraftTotalGSM) / 1550000;
    const kraftBoxWeight = kraftWeightPerUnit * Number(qtyData);
    const kraftSingleBoxPrice = kraftBoxWeight * Number(pricePerKg);

    // Duplex part
    const duplexPaperGSM = 230;
    const duplexTotalGSM = duplexPaperGSM;
    const duplexWeightPerUnit = (reelSize * cutSize * duplexTotalGSM) / 1550000;
    const duplexBoxWeight = duplexWeightPerUnit * Number(qtyData);
    const duplexSingleBoxPrice = duplexBoxWeight * Number(duplexPrice);

    // Combined
    const singleBoxPrice = kraftSingleBoxPrice + duplexSingleBoxPrice;

    const paper = kraftPaperGSM + duplexPaperGSM;
    const totalPF = paper + flute;
    const weightPerUnit = kraftWeightPerUnit + duplexWeightPerUnit;
    const boxWeight = kraftBoxWeight + duplexBoxWeight;

    const kraftBoxCost = kraftSingleBoxPrice * Number(qtyBoxes);
    const duplexBoxCost = duplexSingleBoxPrice * Number(qtyBoxes);

    const totalCost = singleBoxPrice * qtyBoxes;

    // Lamination
    const laminationSingleBoxPrice = isLaminated 
      ? (reelSize * cutSize * Number(laminationRupees) * Number(qtyData)) 
      : 0;
    const laminationBoxCost = laminationSingleBoxPrice * Number(qtyBoxes);

    // Printing Charge
    const printingCharge = isPrintingCharge 
      ? (Number(printingLabourCharge) + (Number(printingPlatePrice) * Number(printingNoOfPlates)))
      : 0;
    const singleBoxPrintingCharge = isPrintingCharge && Number(qtyBoxes) > 0 
      ? printingCharge / Number(qtyBoxes) 
      : 0;
    const printingBoxCost = printingCharge;

    // Ink Cost
    const inkSingleBoxPrice = isInkCost ? Number(inkPricePerBox) : 0;
    const inkBoxCost = inkSingleBoxPrice * Number(qtyBoxes);

    // Screen Printing Cost
    const screenPrintingSingleBoxPrice = isScreenPrinting ? Number(screenPrintingPricePerBox) : 0;
    const screenPrintingBoxCost = screenPrintingSingleBoxPrice * Number(qtyBoxes);

    // Callico Cost
    const callicoSingleBoxPrice = isCallicoCost ? Number(callicoPricePerBox) : 0;
    const callicoBoxCost = callicoSingleBoxPrice * Number(qtyBoxes);

    // Add ALL costs first, then apply GST
    const allCostsBeforeGST = totalCost + laminationBoxCost + printingBoxCost + inkBoxCost + screenPrintingBoxCost + callicoBoxCost;
    const gstAmount = allCostsBeforeGST * (gstPercent / 100);

    const grandTotal = allCostsBeforeGST + gstAmount;

    return {
      reelSize,
      cutSize,
      paper,
      flute,
      totalPF,
      weightPerUnit,
      boxWeight,
      singleBoxPrice,
      totalCost,
      gstAmount,
      grandTotal,
      isDuplex: true,
      kraftPaperGSM,
      kraftTotalGSM,
      kraftWeightPerUnit,
      kraftBoxWeight,
      kraftSingleBoxPrice,
      kraftBoxCost,
      duplexPaperGSM,
      duplexTotalGSM,
      duplexWeightPerUnit,
      duplexBoxWeight,
      duplexSingleBoxPrice,
      duplexBoxCost,
      allCostsBeforeGST,
      isLaminated,
      laminationSingleBoxPrice,
      laminationBoxCost,
      isPrintingCharge,
      printingLabourCharge: Number(printingLabourCharge),
      printingPlatePrice: Number(printingPlatePrice),
      printingNoOfPlates: Number(printingNoOfPlates),
      printingCharge,
      singleBoxPrintingCharge,
      printingBoxCost,
      isInkCost,
      inkSingleBoxPrice,
      inkBoxCost,
      isScreenPrinting,
      screenPrintingSingleBoxPrice,
      screenPrintingBoxCost,
      isCallicoCost,
      callicoSingleBoxPrice,
      callicoBoxCost
    };
  }

  // NORMAL MODE (no duplex)
  const paper = ((paperPlies - 1) * Number(gsmPaper)) + Number(gsmPacking);
  const totalPF = paper + flute;
  const weightPerUnit = (reelSize * cutSize * totalPF) / 1550000;
  const boxWeight = weightPerUnit * qtyData;

  const singleBoxPrice = boxWeight * Number(pricePerKg);
  const totalCost = singleBoxPrice * qtyBoxes;

  const laminationSingleBoxPrice = isLaminated 
    ? (reelSize * cutSize * Number(laminationRupees) * Number(qtyData)) 
    : 0;
  const laminationBoxCost = laminationSingleBoxPrice * Number(qtyBoxes);

  const printingCharge = isPrintingCharge 
    ? (Number(printingLabourCharge) + (Number(printingPlatePrice) * Number(printingNoOfPlates)))
    : 0;
  const singleBoxPrintingCharge = isPrintingCharge && Number(qtyBoxes) > 0 
    ? printingCharge / Number(qtyBoxes) 
    : 0;
  const printingBoxCost = printingCharge;

  const inkSingleBoxPrice = isInkCost ? Number(inkPricePerBox) : 0;
  const inkBoxCost = inkSingleBoxPrice * Number(qtyBoxes);

  const screenPrintingSingleBoxPrice = isScreenPrinting ? Number(screenPrintingPricePerBox) : 0;
  const screenPrintingBoxCost = screenPrintingSingleBoxPrice * Number(qtyBoxes);

  const callicoSingleBoxPrice = isCallicoCost ? Number(callicoPricePerBox) : 0;
  const callicoBoxCost = callicoSingleBoxPrice * Number(qtyBoxes);

  const allCostsBeforeGST = totalCost + laminationBoxCost + printingBoxCost + inkBoxCost + screenPrintingBoxCost + callicoBoxCost;
  const gstAmount = allCostsBeforeGST * (gstPercent / 100);
  const grandTotal = allCostsBeforeGST + gstAmount;

  return {
    reelSize,
    cutSize,
    paper,
    flute,
    totalPF,
    weightPerUnit,
    boxWeight,
    singleBoxPrice,
    totalCost,
    gstAmount,
    grandTotal,
    isDuplex: false,
    duplexSingleBoxPrice: 0,
    duplexBoxCost: 0,
    isLaminated,
    laminationSingleBoxPrice,
    laminationBoxCost,
    isPrintingCharge,
    printingLabourCharge: Number(printingLabourCharge),
    printingPlatePrice: Number(printingPlatePrice),
    printingNoOfPlates: Number(printingNoOfPlates),
    printingCharge,
    singleBoxPrintingCharge,
    printingBoxCost,
    isInkCost,
    inkSingleBoxPrice,
    inkBoxCost,
    isScreenPrinting,
    screenPrintingSingleBoxPrice,
    screenPrintingBoxCost,
    isCallicoCost,
    callicoPricePerBox,
    callicoBoxCost
  };
}


