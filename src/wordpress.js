// src/wordpress.js — BizInZip SEO Pipeline
// Handles all WordPress REST API interactions.
//
// publishPost(article, keyword, image, log) matches pipeline.js call signature:
//   - Downloads image from Unsplash URL
//   - Uploads to WordPress media library
//   - Publishes post with category + tag + featured image
//   - Writes Yoast SEO meta fields
//   - Returns { postId, postUrl, mediaId, mediaUrl }

import { PUBLISHING } from "../config/topics.js";

const WP_URL  = process.env.WP_URL?.replace(/\/$/, "");
const WP_USER = process.env.WP_USER;
const WP_PASS = process.env.WP_APP_PASSWORD;
const AUTH    = "Basic " + Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64");

const log = msg => console.log(`[${new Date().toISOString()}] ${msg}`);

// ── Resolve tag ID from keyword using tagMap ───────────────────────────────
function resolveTagId( keyword = "" ) {
  const kw = String( keyword || "" ).toLowerCase();
  const { tags, tagMap } = PUBLISHING;

  if ( !tags || !tagMap ) return [];
  const allNull = Object.values( tags ).every( v => v === null || v === undefined );
  if ( allNull ) return [];

  for ( const { tag, patterns } of tagMap ) {
    if ( patterns.some( p => kw.includes( p ) ) ) {
      const id = tags[ tag ];
      if ( id ) return [ id ];
    }
  }

  const fallback = tags.salesProspecting;
  return fallback ? [ fallback ] : [];
}

// ── Download image buffer from URL ─────────────────────────────────────────
async function downloadImage( url ) {
  const res = await fetch( url );
  if ( !res.ok ) throw new Error(`Image download failed (HTTP ${res.status}): ${url}`);
  const buffer = await res.arrayBuffer();
  return Buffer.from( buffer );
}

// ── Upload image buffer to WordPress media library ─────────────────────────
async function uploadImage( imageBuffer, filename, mimeType = "image/jpeg" ) {
  log("  Uploading image to WordPress media library...");

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/media`, {
    method:  "POST",
    headers: {
      Authorization:         AUTH,
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
  return { mediaId: parseInt( data.id, 10 ), mediaUrl: data.source_url || "" };
}

// ── Main publish function — matches pipeline.js call signature ─────────────
// pipeline.js calls: publishPost(article, keyword, image, log)
// image = { url, credit: { name, link } }
// Returns: { postId, postUrl, mediaId, mediaUrl }
export async function publishPost( article, keyword, image, _log ) {
  keyword = String( keyword || "" );

  const categoryId = PUBLISHING.categoryId || 1;
  const tagIds     = resolveTagId( keyword );
  const status     = PUBLISHING.postStatus || "publish";

  // ── Download + upload featured image ──────────────────────────────────
  let mediaId  = 0;
  let mediaUrl = "";

  if ( image?.url ) {
    try {
      log("  Downloading hero image...");
      const buffer   = await downloadImage( image.url );
      const filename = `bizinzip-hero-${Date.now()}.jpg`;
      const uploaded = await uploadImage( buffer, filename, "image/jpeg" );
      mediaId  = uploaded.mediaId;
      mediaUrl = uploaded.mediaUrl;
    } catch ( imgErr ) {
      log(`  ⚠ Image upload failed: ${imgErr.message} — publishing without featured image`);
    }
  }

  // ── Log tag ────────────────────────────────────────────────────────────
  if ( tagIds.length > 0 ) {
    const { tags } = PUBLISHING;
    const tagName = Object.entries( tags || {} ).find( ([, v]) => tagIds.includes(v) )?.[0] ?? "unknown";
    log(`  Tag: ${tagName} (ID: ${tagIds[0]})`);
  }

  log(`  Publishing post to WordPress (category ID: ${categoryId}, status: ${status})...`);

  // ── Build post body ────────────────────────────────────────────────────
  const body = {
    title:      article.title,
    content:    article.content,
    excerpt:    article.excerpt || "",
    status,
    categories: [ categoryId ],
    tags:       tagIds,
    ...( Number.isInteger( mediaId ) && mediaId > 0
      ? { featured_media: mediaId }
      : {} ),
  };

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/posts`, {
    method:  "POST",
    headers: {
      Authorization:  AUTH,
      "Content-Type": "application/json",
    },
    body: JSON.stringify( body ),
  });

  if ( !res.ok ) {
    const text = await res.text();
    throw new Error(`Post publish failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  const data    = await res.json();
  const postId  = data.id;
  const postUrl = data.link || data.guid?.rendered || "";

  log(`  Published: ${postUrl} (post ID: ${postId}, category: ${categoryId})`);

  // ── Write Yoast SEO meta ───────────────────────────────────────────────
  await writeYoastMeta( postId, keyword, article.meta_description || article.excerpt || "", article.seo_title || "" );

  return { postId, postUrl, mediaId, mediaUrl };
}

// ── Write Yoast SEO fields ─────────────────────────────────────────────────
async function writeYoastMeta( postId, focusKeyphrase, metaDescription, seoTitle ) {
  log("  Writing Yoast SEO fields...");
  log(`    Focus keyphrase : "${focusKeyphrase}"`);
  log(`    Meta description: "${String(metaDescription).slice(0, 80)}..."`);

  const res = await fetch(`${WP_URL}/wp-json/wp/v2/posts/${postId}`, {
    method:  "POST",
    headers: {
      Authorization:  AUTH,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      meta: {
        _yoast_wpseo_focuskw:  focusKeyphrase,
        _yoast_wpseo_metadesc: metaDescription,
        _yoast_wpseo_title:    seoTitle,
      },
    }),
  });

  if ( !res.ok ) {
    const text = await res.text();
    log(`  ⚠ Yoast meta update failed (HTTP ${res.status}): ${text.slice(0, 150)}`);
    return false;
  }

  const data          = await res.json();
  const confirmedKw   = data.meta?._yoast_wpseo_focuskw  || "";
  const confirmedDesc = data.meta?._yoast_wpseo_metadesc || "";
  log(`  Yoast fields confirmed — keyphrase: "${confirmedKw}", desc: ${confirmedDesc.length} chars`);
  return true;
}
