/**
 * Cloudflare R2 Storage Configuration
 *
 * Provides configuration for Cloudflare R2 storage.
 * For reading public files, only NEXT_PUBLIC_R2_PUBLIC_URL is required.
 *
 * Environment Variables:
 * - Client and Server (for reading public files):
 *   - NEXT_PUBLIC_R2_PUBLIC_URL: Public URL of your R2 bucket (e.g., https://pub-xxxxx.r2.dev)
 *
 * - Server-side only (for uploads, optional):
 *   - R2_ACCOUNT_ID: Your Cloudflare account ID
 *   - R2_ACCESS_KEY_ID: R2 API token access key
 *   - R2_SECRET_ACCESS_KEY: R2 API token secret key
 *   - R2_BUCKET_NAME: Name of your R2 bucket
 *
 * @module lib/storage/r2-client
 */

// ============================================================================
// CLIENT AND SERVER (for reading public URLs)
// ============================================================================

/**
 * Public URL for R2 bucket (without bucket name).
 * Example: "https://pub-xxxxx.r2.dev"
 */
export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

/**
 * R2 bucket name from environment (for server-side uploads).
 */
export const R2_BUCKET_NAME =
  process.env.NEXT_PUBLIC_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || "";

/**
 * Check if R2 public URL is configured (for reading images/catalog).
 * This can work on both client and server.
 * Only requires the public URL - bucket name is not needed for public URLs.
 */
export function isR2Configured(): boolean {
  return !!R2_PUBLIC_URL;
}

// ============================================================================
// SERVER-SIDE ONLY (for uploads)
// ============================================================================

/**
 * Check if R2 upload capability is configured (server-side only).
 * Returns true only if all required environment variables are set.
 */
export function isR2UploadConfigured(): boolean {
  if (typeof window !== "undefined") {
    return false; // Never available on client
  }

  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME
  );
}

/**
 * Gets the R2 endpoint URL for AWS SDK operations.
 * Only available on server-side when R2 upload is configured.
 */
export function getR2EndpointUrl(): string | null {
  if (!isR2UploadConfigured()) {
    return null;
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

/**
 * Lazy-loads the S3Client for R2 uploads.
 * Only call this on the server-side when you need to upload files.
 *
 * @returns Promise resolving to S3Client or null if not configured
 *
 * @example
 * ```ts
 * const client = await getR2Client();
 * if (client) {
 *   // Use client for uploads
 * }
 * ```
 */
export async function getR2Client(): Promise<unknown | null> {
  if (!isR2UploadConfigured()) {
    return null;
  }

  try {
    // Dynamic import to avoid bundling AWS SDK on client
    const { S3Client } = await import("@aws-sdk/client-s3");

    return new S3Client({
      region: "auto",
      endpoint: getR2EndpointUrl()!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  } catch {
    console.warn("⚠️ Failed to load @aws-sdk/client-s3. Install it for R2 upload support.");
    return null;
  }
}
