import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { FALLBACK_PACKAGING_IMAGE } from '../../utils/publicCatalog';

// Import exact user-provided industry PNG images from client/src/Industries
import foodImg from '../../Industries/Food & Beverage Packaging.png';
import pharmaImg from '../../Industries/Pharmaceuticals & Medical.png';
import electricalImg from '../../Industries/Electrical Equipments.png';
import electronicsImg from '../../Industries/Electronics & Hardware.png';
import textileImg from '../../Industries/Textiles & Garment Exports.png';
import agriImg from '../../Industries/Agriculture & Fresh Produce.png';
import ecommerceImg from '../../Industries/E-Commerce & D2C Brands.png';
import castingImg from '../../Industries/Casting Equipments.png';

export default function IndustriesSection() {
  const industries = [
    {
      id: 'food',
      title: 'Food & Beverage Packaging',
      tag: 'HYGIENIC & MOISTURE PROOF',
      desc: 'USFDA-compliant moisture-resistant cartons for food products, edible oils, perishable produce, and beverage bottles.',
      image: foodImg,
      specs: 'Food Grade Kraft & Anti-Humidity Coating'
    },
    {
      id: 'pharma',
      title: 'Logistics & Transport',
      tag: 'HEAVY DUTY & SHOCK PROOF',
      desc: 'Heavy-duty 3-ply & 13-ply containers engineered to protect for logistics and transport.',
      image: pharmaImg,
      specs: 'Up to 1,200 kg Stacking Load Capacity'
    },
    {
      id: 'electrical',
      title: 'Electrical Equipments',
      tag: 'HEAVY DUTY & SHOCK PROOF',
      desc: 'Heavy-duty 5-ply & 7-ply containers engineered to protect electrical machinery, transformers, switchgears, and control panels.',
      image: electricalImg,
      specs: 'Up to 1,200 kg Stacking Load Capacity'
    },
    {
      id: 'electronics',
      title: 'Electronics & Hardware',
      tag: 'ANTI-STATIC & CUSHIONED',
      desc: 'Custom die-cut inserts and anti-static liners designed for delicate circuit boards, appliances, and LED displays.',
      image: electronicsImg,
      specs: 'Shock-Absorbing Flute Protection'
    },
    {
      id: 'textile',
      title: 'Textiles & Garment Exports',
      tag: 'HIGH CAPACITY CARTONS',
      desc: 'Generous volume wardrobe and flat-fold cartons used by leading garment manufacturers for international sea-freight exports.',
      image: textileImg,
      specs: 'Crush-Resistant Outer Liner'
    },
    {
      id: 'agri',
      title: 'Agriculture & Fresh Produce',
      tag: 'VENTILATED & STACKABLE',
      desc: 'Heavy-duty ventilated die-cut trays for fresh fruits, vegetables, and cold-chain agricultural produce distribution.',
      image: agriImg,
      specs: 'High Stacking Strength in Cold Storage'
    },
    {
      id: 'ecommerce',
      title: 'E-Commerce & D2C Brands',
      tag: 'HIGH-GRAPHIC UNBOXING',
      desc: 'Self-locking mailers with custom inner printing that elevate the D2C customer unboxing experience.',
      image: ecommerceImg,
      specs: 'Tool-Free Self Locking Folders'
    },
    {
      id: 'casting',
      title: 'Casting Equipments',
      tag: 'HIGH BURSTING & HEAVY LOAD',
      desc: 'Reinforced multi-wall packaging engineered to withstand heavy metal castings, foundry molds, and industrial forging parts.',
      image: castingImg,
      specs: 'Optimized Heavy Weight Compression'
    }
  ];

  return (
    <section id="industries" className="lp-industries-section">
      <div className="lp-container">
        <div className="lp-section-header">
          <span className="lp-section-tag">SECTOR SOLUTIONS</span>
          <h2 className="lp-section-title">
            Tailored Packaging for Key Industries
          </h2>
          <p className="lp-section-desc">
            <strong>SRI VARI PACKS</strong> supplies custom corrugated packaging built for specific industry load dynamics, moisture requirements, and automation lines.
          </p>
        </div>

        <div className="lp-industries-grid">
          {industries.map(ind => (
            <div key={ind.id} className="lp-industry-card">
              <div className="lp-industry-thumb">
                <img
                  src={ind.image}
                  alt={ind.title}
                  className="lp-industry-img"
                  loading="lazy"
                  width="600"
                  height="400"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = FALLBACK_PACKAGING_IMAGE;
                  }}
                />
                <div className="lp-industry-overlay" />
                <span className="lp-industry-tag-badge">{ind.tag}</span>
              </div>
              <div className="lp-industry-body">
                <div className="lp-industry-title-row">
                  <h3 className="lp-industry-title">{ind.title}</h3>
                  <ArrowUpRight size={18} className="lp-industry-arrow" />
                </div>
                <p className="lp-industry-desc">{ind.desc}</p>
                <div className="lp-industry-spec">{ind.specs}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
