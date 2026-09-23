import { v2 as cloudinary } from 'cloudinary';
import config from '../config/environment.js';

const { cloudName, apiKey, apiSecret, folder } = config.cloudinary;

// Configure Cloudinary SDK if credentials exist
if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
}

/**
 * Check if Cloudinary credentials are fully configured
 * @returns {boolean}
 */
export const isCloudinaryConfigured = () => {
  return Boolean(
    config.cloudinary.cloudName &&
    config.cloudinary.apiKey &&
    config.cloudinary.apiSecret
  );
};

/**
 * Upload an image buffer directly to Cloudinary using upload_stream
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {string} [customFolder] - Optional subfolder override
 * @returns {Promise<{ secureUrl: string, publicId: string, format: string, width: number, height: number, bytes: number }>}
 */
export const uploadImageBuffer = (buffer, customFolder = null) => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(
        new Error(
          'Cloudinary is not configured. Please provide CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the server environment.'
        )
      );
    }

    if (!buffer || !Buffer.isBuffer(buffer)) {
      return reject(new Error('Invalid image buffer provided for upload.'));
    }

    const uploadOptions = {
      folder: customFolder || config.cloudinary.folder || 'vista-holidays/product-updates',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'],
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        }
        if (!result) {
          return reject(new Error('Cloudinary upload returned an empty response.'));
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Upload an invoice PDF buffer directly to Cloudinary using upload_stream
 * @param {Buffer} buffer - Generated PDF buffer
 * @param {string} filename - Filename identifier e.g. Vista-Holidays-Invoice-VISTA-INV-20260924-0001
 * @param {string} [customFolder] - Destination Cloudinary folder (default: 'vista-holidays/invoices')
 * @returns {Promise<{ secureUrl: string, publicId: string, bytes: number }>}
 */
export const uploadPdfBuffer = (buffer, filename, customFolder = 'vista-holidays/invoices') => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(
        new Error(
          'Cloudinary is not configured. Please provide CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the server environment.'
        )
      );
    }

    if (!buffer || !Buffer.isBuffer(buffer)) {
      return reject(new Error('Invalid PDF buffer provided for upload.'));
    }

    const cleanPublicId = filename ? filename.replace(/\.pdf$/i, '') : `invoice-${Date.now()}`;

    const uploadOptions = {
      folder: customFolder || 'vista-holidays/invoices',
      resource_type: 'raw',
      public_id: `${cleanPublicId}.pdf`,
      overwrite: true
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(new Error(`Cloudinary PDF upload failed: ${error.message}`));
        }
        if (!result) {
          return reject(new Error('Cloudinary PDF upload returned an empty response.'));
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format || 'pdf',
          bytes: result.bytes
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Delete an image from Cloudinary by its publicId
 * @param {string} publicId - Cloudinary asset public ID
 * @returns {Promise<{ success: boolean, result?: string, error?: string }>}
 */
export const deleteImageByPublicId = async (publicId) => {
  if (!publicId) {
    return { success: false, reason: 'No public ID provided' };
  }

  if (!isCloudinaryConfigured()) {
    console.warn('[CloudinaryService] Cannot delete image: Cloudinary credentials not configured.');
    return { success: false, reason: 'Cloudinary not configured' };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true
    });

    return {
      success: result.result === 'ok' || result.result === 'not found',
      result: result.result
    };
  } catch (error) {
    console.warn(`[CloudinaryService] Warning: Failed to delete image ${publicId} from Cloudinary:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  isCloudinaryConfigured,
  uploadImageBuffer,
  uploadPdfBuffer,
  deleteImageByPublicId
};

