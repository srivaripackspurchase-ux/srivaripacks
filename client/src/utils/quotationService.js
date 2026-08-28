/**
 * Quotation Service Interface
 * 
 * Modular architectural contract to prepare standard calculation payloads 
 * for future PDF generation, email distribution, and document exports.
 * 
 * NOTE: Preserves 100% of existing calculation logic and output structures.
 */

/**
 * Formats a calculation result object into a standardized Quotation Document Payload.
 * 
 * @param {Object} calculation - Raw calculation data
 * @param {Object} company - Company details
 * @param {Object} size - Size specifications
 * @returns {Object} Standardized Quotation Payload for PDF Generator
 */
export function buildQuotationPayload({ calculation, company, size, customerName = 'Valued Customer' }) {
  if (!calculation) return null;

  return {
    quoteNumber: `QT-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    customer: {
      name: customerName,
    },
    company: {
      id: company?.id,
      name: company?.name || 'N/A',
    },
    specification: {
      label: size?.label || 'Custom Specification',
      lengthInches: size?.length_inches,
      widthInches: size?.width_inches,
      heightInches: size?.height_inches,
      plyType: calculation.ply_type || calculation.plyType,
      gsmPaper: calculation.gsm_paper || calculation.gsmPaper,
      gsmFlute: calculation.gsm_flute || calculation.gsmFlute,
      gsmPacking: calculation.gsm_packing || calculation.gsmPacking,
      bf: calculation.bf,
    },
    metrics: {
      reelSize: calculation.reelSize || calculation.reel_size,
      cutSize: calculation.cutSize || calculation.cut_size,
      weightPerUnit: calculation.weightPerUnit || calculation.weight_per_unit,
      totalWeight: calculation.boxWeight || calculation.box_weight,
    },
    pricing: {
      singleBoxPrice: calculation.singleBoxPrice || calculation.single_box_price || 0,
      totalCost: calculation.totalCost || calculation.total_cost || 0,
      gstPercent: calculation.gstPercent || calculation.gst_percent || 0,
      gstAmount: calculation.gstAmount || calculation.gst_amount || 0,
      grandTotal: calculation.grandTotal || calculation.grand_total || 0,
    }
  };
}
