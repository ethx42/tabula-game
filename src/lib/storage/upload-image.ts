/**
 * Image Upload Helper (Client-side)
 *
 * Uploads images to R2 using Presigned URLs.
 * The file is uploaded directly from the client to R2,
 * bypassing the Next.js server to avoid timeouts and memory limits.
 *
 * @module lib/storage/upload-image
 */

/**
 * Uploads an image file to R2 using Presigned URLs.
 *
 * Flow:
 * 1. Request presigned URL from Next.js API
 * 2. Upload file directly to R2 using the presigned URL
 * 3. Return the final public URL
 *
 * @param file - File to upload
 * @param deckId - Deck identifier
 * @param itemId - Item identifier
 * @returns Public URL of the uploaded image
 *
 * @throws {Error} If the upload fails at any step
 *
 * @example
 * ```ts
 * const file = event.target.files[0];
 * try {
 *   const url = await uploadImage(file, "demo-barranquilla", "01");
 *   console.log("Image uploaded:", url);
 * } catch (error) {
 *   console.error("Upload failed:", error);
 * }
 * ```
 */
export async function uploadImage(
  file: File,
  deckId: string,
  itemId: string
): Promise<string> {
  // Step 1: Request presigned URL from server
  const presignedResponse = await fetch("/api/images/presigned", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: file.name,
      fileType: file.type,
      deckId,
      itemId,
    }),
  });

  if (!presignedResponse.ok) {
    const error = await presignedResponse.json().catch(() => ({
      error: "Failed to get upload URL",
    }));
    throw new Error(error.error || "Failed to get upload URL");
  }

  const { uploadUrl, finalUrl } = await presignedResponse.json();

  if (!uploadUrl || !finalUrl) {
    throw new Error("Invalid response from server");
  }

  // Step 2: Upload file directly to R2 (bypass Next.js server)
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Failed to upload image: ${uploadResponse.status} ${uploadResponse.statusText}`
    );
  }

  // Step 3: Return final public URL
  return finalUrl;
}

/**
 * Validates a file before upload.
 *
 * @param file - File to validate
 * @returns Object with validation result and error message if invalid
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (!file.type.startsWith("image/")) {
    return {
      valid: false,
      error: "File must be an image",
    };
  }

  // Check file size (5MB max)
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

