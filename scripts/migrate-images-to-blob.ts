// One-off migration: converts base64 data-URL images stored in Product.images
// into Vercel Blob URLs.
//
// Root cause being fixed: when BLOB_READ_WRITE_TOKEN is not configured, the
// client falls back to embedding base64 images in product payloads. A few of
// those easily exceed Vercel's 4.5MB serverless payload limit, which makes
// Vercel reject the request inline with 413 FUNCTION_PAYLOAD_TOO_LARGE before
// the API handler ever runs (this is the GET /api/products/:id 413 in the logs).
//
// Run (with BLOB_READ_WRITE_TOKEN from your Vercel Blob store):
//   npx tsx scripts/migrate-images-to-blob.ts
//
// It is safe to re-run: images that are already https URLs are left untouched.

import "dotenv/config";
import { put } from "@vercel/blob";
import prisma from "../lib/prisma";

const DATA_URL = /^data:([^;,]+)(;base64)?,(.*)$/s;
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

function extFor(mime: string): string {
  return EXT_BY_TYPE[mime] || "bin";
}

async function uploadDataUrl(productId: string, index: number, dataUrl: string): Promise<string> {
  const match = DATA_URL.exec(dataUrl);
  if (!match) return dataUrl;
  const [, mime, isBase64, content] = match;
  const buffer = isBase64 ? Buffer.from(content, "base64") : Buffer.from(content, "utf8");
  const ext = extFor(mime);
  const suffix = Math.random().toString(36).slice(2, 8);
  const pathname = `products/${productId}/${index}-${suffix}.${ext}`;
  const result = await put(pathname, buffer, { access: "public", contentType: mime, addRandomSuffix: false });
  return result.url;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN is not set. Add it to your environment first (Vercel Blob store).");
    process.exit(1);
  }

  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  let converted = 0;
  let updatedRows = 0;

  for (const product of products) {
    const images: string[] = Array.isArray(product.images) ? (product.images as string[]) : [];
    const hasDataUrl = images.some((u) => DATA_URL.test(u));
    if (!hasDataUrl) continue;

    const next: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const url = await uploadDataUrl(product.id, i, images[i]);
      if (url !== images[i]) converted++;
      next.push(url);
    }

    await prisma.product.update({ where: { id: product.id }, data: { images: next } });
    updatedRows++;
    console.log(`migrated ${product.id} (${next.length} image(s))`);
  }

  console.log(`\nDone. Converted ${converted} base64 image(s) across ${updatedRows} product(s).`);
  console.log("All products now store compact Blob URLs, keeping every payload under Vercel's 4.5MB limit.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e?.message || e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());