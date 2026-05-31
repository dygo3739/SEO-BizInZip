import { BUSINESS, PILLAR_PAGES, PUBLISHING } from "../config/topics.js";

export async function generateArticle(keyword, kd, vol, relatedPosts, relatedTerms, log) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY env var");

  const competitionLevel = kd == null ? "unknown" : kd < 30 ? "low" : kd < 60 ? "medium" : "high";
  log(`Writing article for "${keyword}" (competition: ${competitionLevel})...`);

  // Blog post internal links block
  const postLinksBlock = relatedPosts.length > 0
    ? `INTERNAL LINKS — Blog Posts (link naturally within body copy):\n${relatedPosts.map(p => `  - "${p.title}" → ${p.url}`).join("\n")}`
    : `No related blog posts yet — site is new. Do not invent links.`;

  // Glossary term internal links block
  const termLinksBlock = relatedTerms.length > 0
    ? `INTERNAL LINKS — Glossary Terms (link the first time each term appears):\n${relatedTerms.map(t => `  - "${t.title}" → ${t.url}`).join("\n")}\nLink the term word naturally as anchor text on its first mention only. Only link if the term genuinely appears.`
    : `No glossary terms available yet.`;

  // Pillar page links — always available
  const pillarLinksBlock = `PILLAR PAGE LINKS — link at least 1 of these naturally in the article:
  - Browse all cities → ${PILLAR_PAGES.cities}
  - Browse all industries → ${PILLAR_PAGES.industries}
  - How BizInZip works → ${PILLAR_PAGES.howItWorks}
  - Search widget (free) → ${PILLAR_PAGES.widget}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: `You are an expert content writer for ${BUSINESS.name} (${BUSINESS.url}), a ${BUSINESS.type}.

PRODUCT KNOWLEDGE — read carefully before writing:
${BUSINESS.description}

AUDIENCE: ${BUSINESS.audience}
TONE: ${BUSINESS.tone}
NICHE: ${BUSINESS.niche}
KEY DIFFERENTIATOR: ${BUSINESS.usp}

WRITING RULES:
- Write practical, no-fluff content that helps sales professionals find and contact local businesses
- You must mention ${BUSINESS.name} exactly ONCE in the article body — naturally, as a tool that solves the specific problem discussed
- The mention should feel like a genuine recommendation, not an advertisement — e.g. "Tools like BizInZip let you search by zip code and export contacts for $0.10 each" rather than "BizInZip is the best tool"
- Reference specific product features accurately (zip code search, $0.10/contact, free to browse, CSV export, Google Places data) — do not invent features
- Do NOT mention BizInZip in the title, meta description, or FAQ questions — only in the body
- The product mention should appear in a section where it is genuinely relevant to the workflow being described

Return ONLY valid JSON (no markdown fences, no preamble) with exactly these fields:
- title: string — compelling, specific H1 headline. Not generic. Speaks to a sales professional.
- seo_title: string — SEO title tag, max 60 chars, target keyword near the start
- content: string — Full HTML article body using <h2>,<h3>,<p>,<ul>,<li>,<strong>,<a href="..."> tags. Min 900 words. Include keyword naturally 4-6 times. Add a practical FAQ section at the end (min 3 questions). Mention ${BUSINESS.name} once or twice naturally. Weave ALL provided internal links into the body as real <a href="URL">anchor text</a> tags.
- excerpt: string — Meta description MUST be 120-155 characters. MUST include the target keyword. Written to maximise click-through from search results. Count characters carefully.
- pinterest_description: string — Practical, action-oriented Pinterest caption, max 500 chars, with a CTA
- unsplash_query: string — 2-4 words for a relevant hero image on Unsplash (e.g. "sales team office", "business meeting handshake", "city buildings aerial")`,
      messages: [{
        role: "user",
        content: `Write a complete, practical blog post for the keyword: "${keyword}"
Search volume: ${vol?.toLocaleString() ?? "unknown"}/month
Competition: ${competitionLevel}

Target keyword for meta description: "${keyword}"
Meta description must be 120-155 characters and must contain "${keyword}".

${postLinksBlock}

${termLinksBlock}

${pillarLinksBlock}

Linking rules:
- Blog post links: weave into relevant sentences, use descriptive anchor text
- Glossary term links: link the term word on first mention only
- Pillar page links: link at least one naturally in the article body
- Never list links at the bottom — all links within body copy
- Do not force a link if it doesn't fit naturally

Remember: the reader is a sales rep, insurance agent, or marketing professional trying to find and contact local businesses more efficiently. Be practical, specific, and respect their time.`,
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API HTTP ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data.content?.find(b => b.type === "text")?.text || "";

  let article;
  try {
    article = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch (e) {
    throw new Error(`Failed to parse Claude response: ${e.message}\nRaw: ${raw.slice(0, 300)}`);
  }

  if (!article.title || !article.content) throw new Error("Claude response missing title or content");

  log(`Article ready: "${article.title}"`);
  log(`Excerpt length: ${article.excerpt?.length ?? 0} chars`);
  log(`Unsplash query: "${article.unsplash_query}"`);
  log(`Post links: ${relatedPosts.length} | Term links: ${relatedTerms.length}`);
  return article;
}

// ── Resolve tag ID from keyword using tagMap ──────────────────────────────
// Checks the keyword against each tagMap entry in order — first match wins.
// Falls back to "salesProspecting" if nothing matches.
export function resolveTagId( keyword ) {
  const kw = keyword.toLowerCase();
  const { tags, tagMap } = PUBLISHING;

  if ( !tagMap || !tags ) return [];

  for ( const { tag, patterns } of tagMap ) {
    if ( patterns.some( p => kw.includes( p ) ) ) {
      const id = tags[ tag ];
      if ( id ) return [ id ];
    }
  }

  // Default fallback tag
  const fallback = tags.salesProspecting;
  return fallback ? [ fallback ] : [];
}

// ── Build WordPress post payload including tags ────────────────────────────
// Call this when publishing to WP instead of building the body inline.
// Resolves the correct tag from the keyword and passes it to WordPress.
export function buildWpPostBody( article, imageId, categoryId, keyword = "", extraFields = {} ) {
  const tagIds = resolveTagId( keyword );

  return {
    title:      article.title,
    content:    article.content,
    excerpt:    article.excerpt,
    status:     PUBLISHING.postStatus || "publish",
    categories: [ categoryId || PUBLISHING.categoryId || 1 ],
    tags:       tagIds,                    // ← one tag resolved from keyword
    ...(imageId ? { featured_media: imageId } : {}),
    ...extraFields,
  };
}
