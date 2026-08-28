/**
 * publicCatalog.js — Read-Only Public-Safe Selector for SRI VARI PACKS.
 * 
 * Provides verified product types, material specs, and manufacturing options
 * derived directly from the application's calculations and configurations,
 * using exact local user-provided PNG assets.
 */

import standardBoxImg from '../images/Standard Box.png';
import padImg from '../images/Pad.png';
import partitionImg from '../images/partition.png';
import trayImg from '../images/Tray.png';
import sleaveImg from '../images/sleave.png';
import collerBoxImg from '../images/coller box.png';
import topSideTrayBoxImg from '../images/Top Side Tray Box.png';
import universalTypeImg from '../images/universal type.png';
import fullClosingBoxImg from '../images/Full Closing Box.png';

// Import exact user-provided manufacturing stage images from imagessss/
import mfgStep1Img from '../imagessss/Customer Order Design.png';
import mfgStep2Img from '../imagessss/Raw Material Preparation.png';
import mfgStep3Img from '../imagessss/Corrugated Board Production.png';
import mfgStep4Img from '../imagessss/Printing & Box Conversion.png';
import mfgStep5Img from '../imagessss/Folding, Gluing & Quality Check.png';
import mfgStep6Img from '../imagessss/Packing, Storage & Delivery.png';

export const FALLBACK_PACKAGING_IMAGE = standardBoxImg;

export const VERIFIED_PACKAGING_TYPES = [
  {
    id: 'standard_box',
    title: 'Standard Box',
    calcType: 'box',
    description: 'Regular Slotted Container (RSC) with outer flaps meeting at the center. The industry standard for high-volume logistics, warehousing, and shipping.',
    plyOptions: ['3-Ply', '5-Ply', '7-Ply', '9-Ply', '11-Ply', '13-Ply'],
    maxPlyText: 'Up to 13-Ply Capability',
    gsmRange: '100 - 220 GSM',
    bfRange: '12 - 22 BF',
    image: standardBoxImg,
    applications: 'FMCG, Industrial Parts, Consumer Electronics'
  },
  {
    id: 'pad',
    title: 'Pad',
    calcType: 'pad',
    description: 'Flat corrugated pad sheets engineered for layer separation, top/bottom box protection, and cushioning fragile contents.',
    plyOptions: ['3-Ply', '5-Ply', '7-Ply', '9-Ply', '11-Ply', '13-Ply'],
    maxPlyText: 'Up to 13-Ply Capability',
    gsmRange: '100 - 220 GSM',
    bfRange: '12 - 22 BF',
    image: padImg,
    applications: 'Layer Division, Pallet Base Pads, Glass Protection'
  },
  {
    id: 'partition',
    title: 'Partition',
    calcType: 'partition',
    description: 'Custom single and paired slotted grid dividers that isolate individual items to prevent surface contact damage during transit.',
    plyOptions: ['3-Ply', '5-Ply', '7-Ply', '9-Ply', '11-Ply', '13-Ply'],
    maxPlyText: 'Up to 13-Ply Capability',
    gsmRange: '100 - 220 GSM',
    bfRange: '12 - 22 BF',
    image: partitionImg,
    applications: 'Glassware, Pharma Vials, Precision Components'
  },
  {
    id: 'tray',
    title: 'Tray',
    calcType: 'tray',
    description: 'Open-top corrugated trays designed for rapid manual or automated loading of produce, beverage bottles, and retail display units.',
    plyOptions: ['3-Ply', '5-Ply', '7-Ply', '9-Ply', '11-Ply', '13-Ply'],
    maxPlyText: 'Up to 13-Ply Capability',
    gsmRange: '100 - 220 GSM',
    bfRange: '12 - 22 BF',
    image: trayImg,
    applications: 'Fresh Agriculture, Beverages, Retail Display Trays'
  },
  {
    id: 'sleave',
    title: 'Sleave',
    calcType: 'sleave',
    description: 'Four-sided protective sleeve enclosures engineered with custom flap allowances to wrap around heavy industrial loads and inner containers.',
    plyOptions: ['3-Ply', '5-Ply', '7-Ply', '9-Ply', '11-Ply', '13-Ply'],
    maxPlyText: 'Up to 13-Ply Capability',
    gsmRange: '100 - 220 GSM',
    bfRange: '12 - 22 BF',
    image: sleaveImg,
    applications: 'Appliance Packaging, Bulk Wrap, Equipment Protection'
  },
  {
    id: 'coller_box',
    title: 'Coller Box',
    calcType: 'coller_box',
    description: 'Heavy-duty collar box packaging built with reinforced vertical walls for containment of heavy machinery components and bulk items.',
    plyOptions: ['3-Ply', '5-Ply', '7-Ply', '9-Ply', '11-Ply', '13-Ply'],
    maxPlyText: 'Up to 13-Ply Capability',
    gsmRange: '100 - 220 GSM',
    bfRange: '12 - 22 BF',
    image: collerBoxImg,
    applications: 'Automotive Assemblies, Heavy Engineering, Hardware'
  },
  {
    id: 'top_side_tray_box',
    title: 'Top Side Tray Box',
    calcType: 'top_side_tray_box',
    description: 'Tray-style box with top and side wall flanged construction for enhanced structural rigidity and top load compression.',
    plyOptions: ['3-Ply', '5-Ply', '7-Ply', '9-Ply', '11-Ply', '13-Ply'],
    maxPlyText: 'Up to 13-Ply Capability',
    gsmRange: '100 - 220 GSM',
    bfRange: '12 - 22 BF',
    image: topSideTrayBoxImg,
    applications: 'Industrial Goods, Cold Chain Distribution, Produce'
  },
  {
    id: 'universal_type',
    title: 'Universal Type',
    calcType: 'universal_type',
    description: 'Multi-utility universal slotted container adaptable for various dimensional configurations and custom order sizes.',
    plyOptions: ['3-Ply', '5-Ply', '7-Ply', '9-Ply', '11-Ply', '13-Ply'],
    maxPlyText: 'Up to 13-Ply Capability',
    gsmRange: '100 - 220 GSM',
    bfRange: '12 - 22 BF',
    image: universalTypeImg,
    applications: 'Multi-Size Logistics, General Cargo, Export Packing'
  },
  {
    id: 'full_closing_box',
    title: 'Full Closing Box',
    calcType: 'full_closing_box',
    description: 'Overlapping top and bottom flaps provide maximum strength against extreme vertical compression and long-distance sea freight transit.',
    plyOptions: ['3-Ply', '5-Ply', '7-Ply', '9-Ply', '11-Ply', '13-Ply'],
    maxPlyText: 'Up to 13-Ply Capability',
    gsmRange: '100 - 220 GSM',
    bfRange: '12 - 22 BF',
    image: fullClosingBoxImg,
    applications: 'Textile Sea Exports, Chemical Drums, Bulk Cargo'
  }
];

export const VERIFIED_MANUFACTURING_STAGES = [
  {
    num: '01',
    title: 'Customer Order & Design',
    shortTitle: 'Order & Design',
    desc: 'Detailed specification analysis, CAD template modeling with exact dimensional allowances (±0.5mm), and customer order approval.',
    image: mfgStep1Img,
    spec: 'CAD Precision & Order Specs'
  },
  {
    num: '02',
    title: 'Raw Material Preparation',
    shortTitle: 'Raw Material',
    desc: 'Inspection and reel staging of virgin kraft paper, test liners, and fluting mediums across 100-220 GSM and 12-22 BF ratings.',
    image: mfgStep2Img,
    spec: '100-220 GSM & 12-22 BF Reels'
  },
  {
    num: '03',
    title: 'Corrugated Board Production',
    shortTitle: 'Board Production',
    desc: 'High-speed automated corrugation forming B, C, and E flutes bonded into 3-Ply up to 13-Ply multi-wall board sheets.',
    image: mfgStep3Img,
    spec: 'Up to 13-Ply Multi-Wall Corrugation'
  },
  {
    num: '04',
    title: 'Printing & Box Conversion',
    shortTitle: 'Printing & Conversion',
    desc: 'Multi-color flexographic water-based ink printing combined with rotary die-cutting, slotting, and creasing into precision box blanks.',
    image: mfgStep4Img,
    spec: 'Flexo Printing & Precision Die-Cutting'
  },
  {
    num: '05',
    title: 'Folding, Gluing & Quality Check',
    shortTitle: 'Folding & Quality',
    desc: 'Automated folder-gluing along manufacturer seams followed by rigorous laboratory testing for Bursting Factor (BF), GSM, and Edge Crush Test (ECT).',
    image: mfgStep5Img,
    spec: 'High-Tack Seam Bonding & Lab QC'
  },
  {
    num: '06',
    title: 'Packing, Storage & Delivery',
    shortTitle: 'Packing & Delivery',
    desc: 'Strapping, stretch-palletizing, warehousing, and Just-In-Time (JIT) dispatch via dedicated transport fleet.',
    image: mfgStep6Img,
    spec: 'Palletized Strapping & JIT Fleet Delivery'
  }
];
