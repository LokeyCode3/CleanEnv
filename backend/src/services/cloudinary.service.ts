import { cloudinary } from '../config/cloudinary';
import { Readable } from 'stream';

export interface UploadResult {
  url: string;
  publicId: string;
  type: 'image' | 'video';
}

/** Returns true when Cloudinary is not yet configured with real credentials. */
const isCloudinaryDemo = (): boolean =>
  !process.env.CLOUDINARY_API_KEY ||
  process.env.CLOUDINARY_API_KEY === 'demo' ||
  process.env.CLOUDINARY_CLOUD_NAME === 'demo';

/**
 * Upload a file buffer to Cloudinary.
 * In demo/dev mode (no real API key) the file is stored as a base64
 * data-URL so the rest of the app continues to work without Cloudinary.
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  mimetype: string,
  folder: string
): Promise<UploadResult> => {
  const resourceType = mimetype.startsWith('video/') ? 'video' : 'image';

  // ── Dev/demo fallback ────────────────────────────────────────────────────
  if (isCloudinaryDemo()) {
    console.warn(
      '⚠️  Cloudinary not configured — storing file as base64 data-URL (dev mode only).'
    );
    const dataUrl = `data:${mimetype};base64,${buffer.toString('base64')}`;
    const fakeId = `pathhole/${folder}/dev_${Date.now()}`;
    return Promise.resolve({ url: dataUrl, publicId: fakeId, type: resourceType });
  }

  // ── Real upload ──────────────────────────────────────────────────────────
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `pathhole/${folder}`,
        resource_type: resourceType,
        quality: 'auto',
        fetch_format: 'auto',
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Upload failed'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          type: resourceType,
        });
      }
    );
    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  if (isCloudinaryDemo()) return;
  await cloudinary.uploader.destroy(publicId);
};
