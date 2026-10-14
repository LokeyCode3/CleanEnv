/**
 * Image Validation Service
 * Calls the Python CLIP microservice to verify that an uploaded image
 * matches the report description and category before saving to Cloudinary.
 */

import http from 'http';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5002';

export interface ValidationResult {
  valid: boolean;
  score: number;
  reason: string;
}

/**
 * Validate a single image buffer against the report description and category.
 *
 * @param imageBuffer  - Raw file buffer from multer
 * @param mimeType     - e.g. "image/jpeg"
 * @param description  - User-supplied report description
 * @param categorySlug - Category slug e.g. "pothole-road-damage"
 */
export async function validateImageRelevance(
  imageBuffer: Buffer,
  mimeType: string,
  description: string,
  categorySlug: string
): Promise<ValidationResult> {
  const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

  const payload = JSON.stringify({
    image: base64Image,
    description,
    category: categorySlug,
  });

  return new Promise((resolve, reject) => {
    const url = new URL('/validate', AI_SERVICE_URL);

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 5002,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as ValidationResult);
        } catch {
          reject(new Error('Invalid JSON from AI service'));
        }
      });
    });

    req.on('error', (err) => {
      // If the AI service is down, fail open with a warning rather than
      // blocking all report submissions.
      console.warn('⚠️  AI validation service unreachable:', err.message);
      resolve({ valid: true, score: 0, reason: 'AI service unavailable – skipped' });
    });

    req.setTimeout(15_000, () => {
      req.destroy();
      console.warn('⚠️  AI validation service timed out – skipping');
      resolve({ valid: true, score: 0, reason: 'AI service timeout – skipped' });
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Validate all uploaded images for a report.
 * Returns the first failure found, or null if all pass.
 */
export async function validateAllImages(
  files: Express.Multer.File[],
  description: string,
  categorySlug: string
): Promise<{ fileIndex: number; result: ValidationResult } | null> {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Only validate image files (skip videos)
    if (!file.mimetype.startsWith('image/')) continue;

    const result = await validateImageRelevance(
      file.buffer,
      file.mimetype,
      description,
      categorySlug
    );

    if (!result.valid) {
      return { fileIndex: i, result };
    }
  }
  return null;
}
