// ─────────────────────────────────────────────────────────────────
//  config/topics.js  —  BizInZip.com
// ─────────────────────────────────────────────────────────────────

export const BUSINESS = {
  name:     "BizInZip",
  url:      "https://bizinzip.com",
  type:     "local business lead generation tool",
  audience: "insurance agents, real estate brokers, sales reps, marketing agencies, and contractors who prospect local businesses",
  location: "United States",
  tone:     "practical, direct, and results-focused — like advice from an experienced sales professional, not a marketer",
  niche:    "finding local business contact info by zip code, B2B lead generation, and sales prospecting",
  usp:      "search free, pay $0.10 per contact — no subscription required",
};

// ── Pillar page URLs — used for internal linking in articles ──────
export const PILLAR_PAGES = {
  cities:     "https://bizinzip.com/cities",
  industries: "https://bizinzip.com/industries",
  howItWorks: "https://bizinzip.com/how-it-works",
  pricing:    "https://bizinzip.com/pricing",
  widget:     "https://bizinzip.com/#search",
};

// ── Publishing settings ───────────────────────────────────────────
export const PUBLISHING = {
  // Find your Blog category ID:
  // WP Admin → Posts → Categories → hover "Blog" → URL shows tag_ID=X
  categoryId: 10,  // ← Confirmed from pipeline logs (post published with category: 10)

  // ── WordPress Tag IDs ─────────────────────────────────────────────
  // To find tag IDs: WP Admin → Posts → Tags → hover any tag → check tag_ID in URL
  // Each post gets ONE primary tag based on its topic type (set in tagMap below).
  // Replace the placeholder IDs once you've created the tags in WordPress.
  tags: {
    howToGuides:       13,  // How-To Guides
    industrySpotlight: 11,  // Industry Spotlights
    toolComparisons:   14,  // Tool Comparisons
    salesProspecting:  12,  // Sales Prospecting
    zipCodeStrategy:   15,  // Zip Code Strategy
  },

  // ── Tag assignment rules ──────────────────────────────────────────
  // Keywords matching these patterns get the corresponding tag.
  // The pipeline checks each topic against these in order — first match wins.
  tagMap: [
    { tag: "toolComparisons",   patterns: ["vs ", "alternative", "comparison", "vs.", "better than", "instead of", "replace"] },
    { tag: "industrySpotlight", patterns: ["insurance", "real estate", "dentist", "roofing", "hvac", "plumber", "contractor", "lawyer", "mortgage", "attorney", "agent", "broker"] },
    { tag: "zipCodeStrategy",   patterns: ["zip code", "zip", "city", "territory", "geographic", "hyperlocal", "local area", "by area", "by location"] },
    { tag: "howToGuides",       patterns: ["how to", "how do", "guide", "step", "tips for", "ways to", "best way"] },
    { tag: "salesProspecting",  patterns: ["prospect", "cold", "outreach", "lead", "list", "contact", "find business", "sales"] },
  ],

  postStatus: "publish",
};

// Site start date — controls difficulty tier progression
export const SITE_START_DATE = "2026-05-01";

// ── Topic queue ───────────────────────────────────────────────────
// Picked in round-robin order (least-used first).
// Mix of: lead gen fundamentals, industry-specific, tools/comparisons, local marketing, sales tips.
export const TOPICS = [
  // Lead generation fundamentals
  "how to find local business leads",
  "how to build a B2B prospect list",
  "local business prospecting tips",
  "how to find small business contact information",
  "best ways to get business leads without a subscription",

  // Industry-specific prospecting
  "how insurance agents find new clients",
  "real estate prospecting by zip code",
  "how to find dentist leads",
  "roofing contractor leads by zip code",
  "how to find HVAC contractor contact info",
  "plumber leads by zip code",
  "auto repair shop leads for sales reps",
  "how to prospect law firms locally",
  "how to find mortgage broker leads",

  // Tools and tactics
  "how to use Google Maps for lead generation",
  "how to find business email addresses free",
  "how to export business leads to CSV",
  "pay per lead vs subscription lead generation tools",
  "how to build a sales territory prospect list",
  "local business data for sales teams",

  // Sales tips
  "cold outreach tips for local businesses",
  "how to cold call small businesses",
  "email prospecting for insurance agents",
  "how to write a cold email to a local business",
  "sales territory mapping by zip code",
  "how to prioritize leads by Google rating",

  // Comparisons — honest, accurate positioning
  "ZoomInfo alternatives for local sales reps",
  "why local businesses don't need ZoomInfo",
  "D7 Lead Finder vs BizInZip",
  "Outscraper alternatives for non-technical sales reps",
  "best Google Maps scraping tools for sales",
  "cheap alternatives to ZoomInfo for small business",
  "PhantomBuster alternatives for local prospecting",
  "how to find local business contacts without a data subscription",
  "Google Maps lead generation tools compared",
  "best tools to find local business phone numbers",

  // Local marketing
  "how to find insurance agencies in my area",
  "how to prospect real estate agents by city",
  "finding local contractors for outreach",
  "how to target local businesses by industry",
  "hyperlocal marketing for B2B sales",
];

// ── Difficulty tiers ──────────────────────────────────────────────
export const TIERS = [
  { id: 1, label: "Beginner",  weeksStart: 0,  kdMax: 25,  volMin: 0,    desc: "Long-tail, low competition" },
  { id: 2, label: "Growing",   weeksStart: 4,  kdMax: 45,  volMin: 100,  desc: "Moderate competition"       },
  { id: 3, label: "Competing", weeksStart: 13, kdMax: 65,  volMin: 500,  desc: "Real traffic potential"     },
  { id: 4, label: "Authority", weeksStart: 25, kdMax: 100, volMin: 1000, desc: "High-value, high authority" },
];
