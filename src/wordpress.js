// src/wordpress.js — BizInZip SEO Pipeline
// Handles all WordPress REST API interactions:
//   - Image upload to media library
//   - Post publishing with category + tag
//   - Yoast SEO meta fields
//
// Tag resolution uses PUBLISHING.tagMap from config/topics.js
// so each post gets ONE tag automatically based on its keyword.

import { PUBLISHING } from "../config/topics.js";

const WP_URL  = process.env.WP_URL?.replace(/\/$/, "");
const WP_USER = process.env.WP_USER;
const WP_PASS = process.env.WP_APP_PASSWORD;

// Basic auth header — reused for every request
const AUTH = "Basic " + Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

const log = msg => console.log(`[${new Date().toISOString()}] ${msg}`);

// ── Resolve tag ID from keyword using tagMap ───────────────────────────────
// Checks keyword against each tagMap entry in order — first match wins.
// Falls back to salesProspecting if nothing matches, or [] if IDs not set yet.
function resolveTagId( keyword = "" ) {
  const kw      = keyword.toLowerCase();
  const { tags, tagMap } = PUBLISHING;

  // If tags haven't been configured yet, skip silently
  if ( !tags || !tagMap ) return [];
  const allNull = Object.values( tags ).every( v => v === null || v === undefined );
  if ( allNull ) return [];

  for ( const { tag, patterns } of tagMap ) {
    if ( patterns.some( p => kw.includes( p ) ) ) {
      const id = tags[ tag ];
      if ( id ) return [ id ];
    }
  }

  // Fallback — tag as Sales Prospecting
  const fallback = tags.salesProspecting;
  return fallback ? [ fallback ] : [];
}

// ── Upload image buffer to WordPress media library ─────────────────────────
export async function uploadImage( imageBuffer, filename, mimeType = "image/jpeg" ) {
  log("  Uploading image to WordPress media library...");

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/media`, {
    method:  "POST",
    headers: {
      Authorization:        AUTH,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type":        mimeType,
    },
    body: imageBuffer,
  });

  if ( !res.ok ) {
    const text = await res.text();
    throw new Error(`Media upload failed (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  log(`  Image uploaded (ID: ${data.id})`);
  return data.id;
}

// ── Publish post to WordPress ──────────────────────────────────────────────
export async function publishPost( article, imageId, keyword = "" ) {
  const categoryId = PUBLISHING.categoryId || 1;
  const tagIds     = resolveTagId( keyword );
  const status     = PUBLISHING.postStatus || "publish";

  log(`  Publishing post to WordPress (category ID: ${categoryId}, status: ${status})...`);
  if ( tagIds.length > 0 ) {
    // Find which tag name we matched for logging
    const { tags } = PUBLISHING;
    const tagName = Object.entries( tags || {} ).find( ([, v]) => tagIds.includes(v) )?.[0] ?? "unknown";
    log(`  Tag: ${tagName} (ID: ${tagIds[0]})`);
  }

  const body = {
    title:          article.title,
    content:        article.content,
    excerpt:        article.excerpt   || "",
    status,
    categories:     [ categoryId ],
    tags:           tagIds,             // ← resolved from keyword via tagMap
    featured_media: imageId || 0,
  };

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/posts`, {
    method:  "POST",
    headers: {
      Authorization: AUTH,
      "Content-Type": "application/json",
    },
    body: JSON.stringify( body ),
  });

  if ( !res.ok ) {
    const text = await res.text();
    throw new Error(`Post publish failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const url  = data.link || data.guid?.rendered || "";
  log(`  Published: ${url} (post ID: ${data.id}, category: ${categoryId})`);
  return { postId: data.id, url };
}

// ── Write Yoast SEO fields via post meta ───────────────────────────────────
export async function writeYoastMeta( postId, focusKeyphrase, metaDescription ) {
  log("  Writing Yoast SEO fields...");
  log(`    Focus keyphrase : "${focusKeyphrase}"`);
  log(`    Meta description: "${metaDescription.slice(0, 80)}..."`);

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/posts/${postId}`, {
    method:  "POST",
    headers: {
      Authorization:  AUTH,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      meta: {
        _yoast_wpseo_focuskw:    focusKeyphrase,
        _yoast_wpseo_metadesc:   metaDescription,
        _yoast_wpseo_title:      article?.seo_title || "",
      },
    }),
  });

  if ( !res.ok ) {
    const text = await res.text();
    log(`  ⚠ Yoast meta update failed (HTTP ${res.status}): ${text.slice(0, 150)}`);
    return false;
  }

  const data = await res.json();
  const confirmedKw   = data.meta?._yoast_wpseo_focuskw  || "";
  const confirmedDesc = data.meta?._yoast_wpseo_metadesc || "";
  log(`  Yoast fields confirmed — keyphrase: "${confirmedKw}", desc: ${confirmedDesc.length} chars`);
  return true;
}
