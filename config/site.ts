/**
 * Single source of truth for all site content.
 *
 * Every piece of copy, price, phone number, review, and image path used by the UI
 * must live here. Components must never hardcode marketing copy.
 *
 * Placeholder data only — replace with the client's real details before launch.
 */

export type VehicleClass = "sedan" | "suv" | "truck";

export interface ImageAsset {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** Cover-fit crop focus for a frame sequence, 0–1 (0.5 = centered). */
export interface SeqFocus {
  x: number;
  y: number;
}

export interface VehicleSize {
  id: VehicleClass;
  label: string;
  note: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  tagline: string;
  price: number;
  currency: "USD";
  duration: string;
  features: string[];
  /** Price multipliers applied to `price` for each vehicle class. */
  vehicleMultipliers: Record<VehicleClass, number>;
  /** Photography per package; null until the asset exists — layouts must handle it. */
  image: ImageAsset | null;
  featured: boolean;
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
}

export interface Review {
  id: string;
  name: string;
  vehicle: string;
  rating: 1 | 2 | 3 | 4 | 5;
  quote: string;
  source: "Google" | "Yelp" | "Instagram";
  date: string;
}

export interface SiteSection {
  label: string;
}

export interface HeadlineLine {
  text: string;
  accent: boolean;
}

export interface WashCopy {
  initial: string;
  mid: string;
  done: string;
  beforeAfter: string;
  meterLabel: string;
  meterUnit: string;
  sliderLabel: string;
}

export interface MacroCopy {
  headline: string;
  /** Problem headline shown while the paint is still swirled (before the lens). */
  problem: string;
  swapLines: string[];
  chips: string[];
  sliderLabel: string;
}

export interface CoatingCopy {
  headline: string;
  /** Label swapped in at ~60% of the scrubbed seal wipe. */
  sealed: string;
  /** Pills fading in at ~80%, same style as the macro chips. */
  chips: string[];
  meterLabel: string;
  meterUnit: string;
}

export interface ProofStat {
  /** Final value of the count-up numeral. */
  value: number;
  /** Rendered right after the numeral, e.g. "+" or "%". */
  suffix: string;
  /** Decimal places for the count-up (use 1 for "5.0"). */
  decimals?: number;
  label: string;
}

/** One before/after gallery card (draggable comparison divider). */
export interface ProofCard {
  id: string;
  label: string;
  before: ImageAsset;
  after: ImageAsset;
}

export interface ProofCopy {
  /** Display headline, one entry per line (uppercase render). */
  headline: string[];
  /** Floating stat numerals that count up on entry. */
  stats: ProofStat[];
  /** Accessible label shared by every before/after slider. */
  comparisonLabel: string;
}

export interface FooterCopy {
  /** Closing statement shown above the contact block. */
  eyebrow: string;
  headline: string;
  legal: string;
}

export interface PayoffCopy {
  headlineLines: HeadlineLine[];
  cta: string;
}

export interface ServicesCopy {
  headline: string;
  intro: string;
  sizeLabel: string;
  featuredLabel: string;
  bookLabel: string;
  addonsLabel: string;
  addonsIntro: string;
}

export interface SiteCopy {
  wash: WashCopy;
  macro: MacroCopy;
  coating: CoatingCopy;
  payoff: PayoffCopy;
  services: ServicesCopy;
  proof: ProofCopy;
  footer: FooterCopy;
}

export interface SiteConfig {
  brand: {
    name: string;
    tagline: string;
    description: string;
    city: string;
    region: string;
    established: string;
  };
  contact: {
    phoneDisplay: string;
    phoneHref: string;
    email: string;
    address: {
      street: string;
      city: string;
      region: string;
      postalCode: string;
    };
    hours: Array<{ days: string; hours: string }>;
    bookingUrl: string;
    instagram: string;
  };
  nav: {
    links: Array<{ label: string; href: string }>;
    cta: { label: string; href: string };
  };
  seo: {
    url: string;
    title: string;
    description: string;
  };
  ui: {
    skipToContent: string;
    primaryNav: string;
    homeLink: string;
  };
  copy: SiteCopy;
  vehicleSizes: VehicleSize[];
  services: ServicePackage[];
  addOns: AddOn[];
  reviews: Review[];
  images: {
    /** Wash video extracted frame sequence (public/seq/wash and public/seq/wash-m). */
    washSeq: {
      desktopPath: string;
      mobilePath: string;
      desktopCount: number;
      mobileCount: number;
      pad: number;
      ext: string;
      width: number;
      height: number;
      focus: SeqFocus;
    };
    /** Ceramic coating wipe sequence (public/frames/coating and coating-m). */
    coatingSeq: {
      desktopPath: string;
      mobilePath: string;
      desktopCount: number;
      mobileCount: number;
      pad: number;
      ext: string;
      width: number;
      height: number;
      focus: SeqFocus;
    };
    /** Payoff sun-flood sequence (public/frames/sun and sun-m). */
    sunSeq: {
      desktopPath: string;
      mobilePath: string;
      desktopCount: number;
      mobileCount: number;
      pad: number;
      ext: string;
      width: number;
      height: number;
      focus: SeqFocus;
    };
    macro: { before: ImageAsset; after: ImageAsset };
    waterBeading: ImageAsset;
    /** Proof gallery: background plate + before/after comparison cards. */
    proof: { bg: ImageAsset; cards: ProofCard[] };
    /** Footer backdrop; `null` renders a dark-gradient placeholder. */
    footer: { bg: ImageAsset | null };
    og: ImageAsset;
  };
  sections: {
    washScene: SiteSection;
    macroReveal: SiteSection;
    coating: SiteSection;
    proof: SiteSection;
    payoff: SiteSection;
    footer: SiteSection;
  };
}

const sedanSuvTruck = (
  suv: number,
  truck: number,
): Record<VehicleClass, number> => ({ sedan: 1, suv, truck });

export const site: SiteConfig = {
  brand: {
    name: "BRAND",
    tagline: "Flawless, by hand.",
    description:
      "Premium detailing for drivers in CITY who notice the difference. Paint-safe washes, careful correction, and long-lasting protection — by appointment only.",
    city: "CITY",
    region: "ST",
    established: "2019",
  },

  contact: {
    phoneDisplay: "(555) 010-2020",
    phoneHref: "tel:+15550102020",
    email: "hello@brand.example",
    address: {
      street: "100 Detail Lane",
      city: "CITY",
      region: "ST",
      postalCode: "00000",
    },
    hours: [
      { days: "Monday – Friday", hours: "8:00 – 18:00" },
      { days: "Saturday", hours: "9:00 – 16:00" },
      { days: "Sunday", hours: "Closed" },
    ],
    bookingUrl: "#contact",
    instagram: "https://instagram.com/",
  },

  nav: {
    links: [
      { label: "Work", href: "#proof" },
      { label: "Contact", href: "#contact" },
    ],
    cta: { label: "Book Now", href: "#contact" },
  },

  seo: {
    url: "https://brand.example",
    title: "BRAND — Premium Car Detailing in CITY",
    description:
      "Paint-safe washes, interior resets, paint correction, and ceramic coating in CITY. By appointment only.",
  },

  ui: {
    skipToContent: "Skip to content",
    primaryNav: "Primary",
    homeLink: "home",
  },

  copy: {
    wash: {
      initial: "Scroll to wash it.",
      mid: "Wash it.",
      done: "Clean.",
      beforeAfter: "Before / After",
      meterLabel: "Paint cleaned",
      meterUnit: "%",
      sliderLabel: "Drag to compare before and after",
    },
    macro: {
      headline: "Look closer.",
      problem: "Swirls. Everywhere.",
      swapLines: ["Swirls out.", "Glass on."],
      chips: ["Paint correction", "Ceramic coating"],
      sliderLabel: "Drag to reveal the finish",
    },
    coating: {
      headline: "Now seal it.",
      sealed: "Sealed. Shine locked in.",
      chips: ["Hydrophobic", "UV protection", "Easy to clean"],
      meterLabel: "Seal progress",
      meterUnit: "%",
    },
    payoff: {
      headlineLines: [
        { text: "Keys back.", accent: false },
        { text: "Jaw drops.", accent: true },
      ],
      cta: "Book your detail",
    },
    services: {
      headline: "Services.",
      intro:
        "Four packages, honest prices, zero upsell theatre. Switch your vehicle size and the numbers follow.",
      sizeLabel: "Vehicle size",
      featuredLabel: "Most booked",
      bookLabel: "Book",
      addonsLabel: "Add-ons",
      addonsIntro: "Bolt any of these onto any package.",
    },
    proof: {
      headline: ["Don't take", "our word for it."],
      // PLACEHOLDER - replace with real proof stats (count up on entry).
      stats: [
        { value: 250, suffix: "+", label: "Cars detailed" },
        { value: 5, suffix: "", decimals: 1, label: "Average rating" },
        { value: 100, suffix: "%", label: "Hand-finished" },
      ],
      comparisonLabel: "Drag to compare before and after",
    },
    footer: {
      // PLACEHOLDER - replace with final legal copy.
      eyebrow: "By appointment",
      headline: "SEE THE DIFFERENCE.",
      legal: "© 2026 BRAND. All rights reserved. By appointment only.",
    },
  },

  vehicleSizes: [
    {
      id: "sedan",
      label: "Sedan",
      note: "Coupes, hatchbacks, sedans",
    },
    {
      id: "suv",
      label: "SUV",
      note: "Crossovers, SUVs, minivans",
    },
    {
      id: "truck",
      label: "Truck",
      note: "Pickups and full-size SUVs",
    },
  ],

  services: [
    {
      id: "signature-wash",
      name: "Signature Wash",
      tagline: "The weekly standard.",
      price: 95,
      currency: "USD",
      duration: "90 min",
      features: [
        "pH-neutral pre-wash and snow foam",
        "Two-bucket hand wash with grit guards",
        "Wheels, barrels, and tires degreased",
        "Bug and tar removal",
        "Hand-dried with filtered air",
        "Tire dressing and exterior glass",
      ],
      vehicleMultipliers: sedanSuvTruck(1.2, 1.35),
      image: null, // TODO: service-wash photography (close-up of mitt on dark paint)
      featured: false,
    },
    {
      id: "interior-reset",
      name: "Interior Reset",
      tagline: "Every surface, reset.",
      price: 225,
      currency: "USD",
      duration: "3.5 hrs",
      features: [
        "Full vacuum including trunk and crevices",
        "Hot-water extraction on carpets and mats",
        "Leather cleaned and conditioned",
        "Vents, console, and touchpoints detailed",
        "Interior and exterior glass",
        "Light ozone odor treatment",
      ],
      vehicleMultipliers: sedanSuvTruck(1.25, 1.4),
      image: null, // TODO: service-interior photography (leather cabin detail)
      featured: false,
    },
    {
      id: "paint-correction",
      name: "Paint Correction",
      tagline: "Remove what washing left behind.",
      price: 595,
      currency: "USD",
      duration: "6–8 hrs",
      features: [
        "Two-stage machine polish",
        "85–95% defect removal target",
        "Paint depth and gloss meter readings",
        "Edges, trim, and badges hand-finished",
        "Panel wipe and gloss inspection",
        "Paint-safe wash included",
      ],
      vehicleMultipliers: sedanSuvTruck(1.2, 1.35),
      image: null, // TODO: service-correction photography (polishing on dark panel)
      featured: true,
    },
    {
      id: "ceramic-coating",
      name: "Ceramic Coating",
      tagline: "Protection measured in years.",
      price: 1450,
      currency: "USD",
      duration: "2 days",
      features: [
        "Multi-stage decontamination wash",
        "One-step polish and panel wipe",
        "Five-year ceramic coating",
        "Wheels, glass, and trim coated",
        "48-hour controlled cure",
        "Maintenance guide and aftercare kit",
      ],
      vehicleMultipliers: sedanSuvTruck(1.25, 1.45),
      image: null, // TODO: service-ceramic photography (beading on coated hood)
      featured: false,
    },
  ],

  addOns: [
    {
      id: "engine-bay",
      name: "Engine Bay Detail",
      description:
        "Degreased, rinsed, and dressed with all sensitive electronics covered.",
      price: 75,
      duration: "45 min",
    },
    {
      id: "pet-hair",
      name: "Pet Hair Removal",
      description:
        "Rubber brush, extraction, and a final pass with compressed air.",
      price: 60,
      duration: "45 min",
    },
    {
      id: "headlight-restoration",
      name: "Headlight Restoration",
      description:
        "Wet-sanded, polished, and sealed for clearer output and a cleaner front end.",
      price: 120,
      duration: "90 min",
    },
  ],

  // PLACEHOLDER - replace with real reviews. Rotated in the Proof section.
  reviews: [
    {
      id: "review-01",
      name: "Maya R.",
      vehicle: "2022 Audi Q5",
      rating: 5,
      quote:
        "They found swirl marks I didn't know were there — and then they were gone. The car looked better than the day I bought it.",
      source: "Google",
      date: "2026-08-14",
    },
    {
      id: "review-02",
      name: "Daniel K.",
      vehicle: "2021 Ford F-150",
      rating: 5,
      quote:
        "Booked the interior reset after a winter of dog hair and coffee. It smells like a new truck again. Zero shortcuts.",
      source: "Google",
      date: "2026-07-29",
    },
    {
      id: "review-03",
      name: "Priya S.",
      vehicle: "2023 Tesla Model 3",
      rating: 5,
      quote:
        "The only wash I trust with the paint. Clear communication, careful hands, and no upsell theatre.",
      source: "Instagram",
      date: "2026-07-02",
    },
    {
      id: "review-04",
      name: "Marcus T.",
      vehicle: "2019 Porsche 911",
      rating: 5,
      quote:
        "Paint correction was worth every dollar. Panel edges are perfect, and they walked me through the readings.",
      source: "Google",
      date: "2026-06-18",
    },
    {
      id: "review-05",
      name: "Elena V.",
      vehicle: "2020 Volvo XC60",
      rating: 5,
      quote:
        "Dropped it off dusty and picked it up looking showroom-new. The ceramic coating still beads like day one.",
      source: "Yelp",
      date: "2026-05-30",
    },
    {
      id: "review-06",
      name: "Jordan A.",
      vehicle: "2022 Ram 1500",
      rating: 5,
      quote:
        "Truck pricing was upfront, no surprises at pickup. The wheel barrels are cleaner than my kitchen.",
      source: "Google",
      date: "2026-05-11",
    },
  ],

  images: {
    washSeq: {
      desktopPath: "/seq/wash/f_",
      mobilePath: "/seq/wash-m/f_",
      desktopCount: 120,
      mobileCount: 96,
      pad: 4,
      ext: "webp",
      width: 1280,
      height: 720,
      // Car sits centered; on tall stages the sides crop away, keep center.
      focus: { x: 0.5, y: 0.55 },
    },
    macro: {
      before: {
        src: "/img/paint-macro-before.webp",
        alt: "Macro view of swirled, dull paint under workshop light",
        width: 2400,
        height: 1340,
      },
      after: {
        src: "/img/paint-macro-after.webp",
        alt: "Macro view of corrected, glossy paint with crisp reflections",
        width: 2400,
        height: 1340,
      },
    },
    coatingSeq: {
      desktopPath: "/frames/coating/f-",
      mobilePath: "/frames/coating-m/f-",
      desktopCount: 90,
      mobileCount: 60,
      pad: 4,
      ext: "webp",
      width: 1600,
      height: 900,
      // Car sits center-low; keep it in frame on portrait stages.
      focus: { x: 0.5, y: 0.6 },
    },
    // FFmpeg: assets/keys-sun.mp4.mp4 → desktop 18fps/1600w (108 frames),
    // mobile 12fps/900w (72 frames).
    sunSeq: {
      desktopPath: "/frames/sun/f-",
      mobilePath: "/frames/sun-m/f-",
      desktopCount: 108,
      mobileCount: 72,
      pad: 4,
      ext: "webp",
      width: 1600,
      height: 900,
      // Car sits center-low; keep it in frame on portrait stages.
      focus: { x: 0.5, y: 0.6 },
    },
    waterBeading: {
      src: "/img/water-beading.webp",
      alt: "Water beading and sheeting off freshly corrected deep-gloss paint",
      width: 2400,
      height: 1340,
    },
    proof: {
      bg: {
        src: "/img/proof-bg.webp",
        alt: "Water beading and sheeting off corrected deep-gloss paint",
        width: 1920,
        height: 1072,
      },
      cards: [
        {
          id: "proof-1-door-panel",
          label: "Door panel",
          before: {
            src: "/img/proof-1-before.webp",
            alt: "Swirled, dusty paint before correction",
            width: 1400,
            height: 1045,
          },
          after: {
            src: "/img/proof-1-after.webp",
            alt: "Deep-gloss paint after correction",
            width: 1400,
            height: 1045,
          },
        },
        {
          // PLACEHOLDER - swap for a dedicated proof-2 before/after pair.
          id: "proof-2-hood",
          label: "Hood",
          before: {
            src: "/img/proof-2-before.webp",
            alt: "Uncoated, dull paint before the ceramic treatment",
            width: 1400,
            height: 781,
          },
          after: {
            src: "/img/proof-2-after.webp",
            alt: "Beading, coated paint after the ceramic treatment",
            width: 1400,
            height: 781,
          },
        },
      ],
    },
    footer: {
      // PLACEHOLDER - add a footer backdrop photo (public/img/footer-bg.webp)
      // and set width/height; null renders a dark-gradient placeholder.
      bg: null,
    },
    og: {
      src: "/img/og.webp",
      alt: "BRAND premium car detailing in CITY",
      width: 1200,
      height: 630,
    },
  },

  sections: {
    washScene: { label: "Wash Scene" },
    payoff: { label: "Payoff" },
    macroReveal: { label: "Macro Reveal" },
    coating: { label: "Ceramic Coating" },
    proof: { label: "Proof" },
    footer: { label: "Footer" },
  },
};

export default site;
