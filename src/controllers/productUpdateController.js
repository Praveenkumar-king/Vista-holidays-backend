import ProductUpdate from '../models/ProductUpdate.js';
import ProductUpdateSeen from '../models/ProductUpdateSeen.js';
import { uploadImageBuffer, deleteImageByPublicId, isCloudinaryConfigured } from '../services/cloudinaryService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// SemVer regex pattern
const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * GET /api/admin/product-updates
 * List all product updates with metrics and filtering
 */
export const getAdminProductUpdates = async (req, res) => {
  try {
    const { search = '', status = 'All' } = req.query;

    const query = {};

    // Filter by status if not 'All'
    if (status && status !== 'All') {
      query.status = status.toLowerCase();
    }

    // Search by version, title, or description
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { version: searchRegex },
        { title: searchRegex },
        { description: searchRegex }
      ];
    }

    const updates = await ProductUpdate.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Summary counts for directory badges
    const [total, published, draft, unpublished] = await Promise.all([
      ProductUpdate.countDocuments(),
      ProductUpdate.countDocuments({ status: 'published' }),
      ProductUpdate.countDocuments({ status: 'draft' }),
      ProductUpdate.countDocuments({ status: 'unpublished' })
    ]);

    return successResponse(res, 'Product updates retrieved successfully.', {
      updates,
      summary: {
        total,
        published,
        draft,
        unpublished
      },
      cloudinaryConfigured: isCloudinaryConfigured()
    });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch product updates.', error.message, 500);
  }
};

/**
 * GET /api/admin/product-updates/:id
 * Retrieve single update by ID
 */
export const getAdminProductUpdateById = async (req, res) => {
  try {
    const { id } = req.params;
    const update = await ProductUpdate.findById(id).lean();

    if (!update) {
      return errorResponse(res, 'Product update not found.', null, 404);
    }

    return successResponse(res, 'Product update retrieved successfully.', update);
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve product update.', error.message, 500);
  }
};

/**
 * POST /api/admin/product-updates
 * Create a new product update
 */
export const createProductUpdate = async (req, res) => {
  try {
    const { version, title, description, status = 'draft', slides = [] } = req.body;

    if (!version || !version.trim()) {
      return errorResponse(res, 'Version is required.', null, 400);
    }

    const cleanVersion = version.trim();
    if (!SEMVER_REGEX.test(cleanVersion)) {
      return errorResponse(
        res,
        `"${cleanVersion}" is not a valid Semantic Version (e.g. 1.0.0, 1.2.0-beta.1).`,
        null,
        400
      );
    }

    // Check version uniqueness
    const existingVersion = await ProductUpdate.findOne({ version: cleanVersion });
    if (existingVersion) {
      return errorResponse(
        res,
        `Version ${cleanVersion} already exists. Each release must have a unique semantic version.`,
        null,
        409
      );
    }

    if (!title || !title.trim()) {
      return errorResponse(res, 'Main update title is required.', null, 400);
    }

    if (!description || !description.trim()) {
      return errorResponse(res, 'Main update description is required.', null, 400);
    }

    // Validate slides if publishing
    if (status === 'published' && (!Array.isArray(slides) || slides.length === 0)) {
      return errorResponse(
        res,
        'Cannot publish an update without at least one carousel slide.',
        null,
        400
      );
    }

    // Process and sort slides
    const formattedSlides = (slides || []).map((slide, idx) => ({
      title: slide.title?.trim() || `Feature ${idx + 1}`,
      description: slide.description?.trim() || '',
      imageUrl: slide.imageUrl?.trim() || '',
      cloudinaryPublicId: slide.cloudinaryPublicId?.trim() || '',
      order: typeof slide.order === 'number' ? slide.order : idx
    }));

    // Ensure slides have required fields
    for (let i = 0; i < formattedSlides.length; i++) {
      const slide = formattedSlides[i];
      if (!slide.imageUrl) {
        return errorResponse(
          res,
          `Slide #${i + 1} is missing an image. Please upload a slide image before saving.`,
          null,
          400
        );
      }
      if (!slide.title) {
        return errorResponse(res, `Slide #${i + 1} is missing a title.`, null, 400);
      }
    }

    const newUpdate = new ProductUpdate({
      version: cleanVersion,
      title: title.trim(),
      description: description.trim(),
      status: status || 'draft',
      slides: formattedSlides,
      publishedAt: status === 'published' ? new Date() : null
    });

    await newUpdate.save();

    return successResponse(res, 'Product update created successfully.', newUpdate, 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create product update.', error.message, 500);
  }
};

/**
 * PUT /api/admin/product-updates/:id
 * Update an existing product update and clean up replaced assets
 */
export const updateProductUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { version, title, description, status, slides = [] } = req.body;

    const existing = await ProductUpdate.findById(id);
    if (!existing) {
      return errorResponse(res, 'Product update not found.', null, 404);
    }

    if (version && version.trim()) {
      const cleanVersion = version.trim();
      if (!SEMVER_REGEX.test(cleanVersion)) {
        return errorResponse(
          res,
          `"${cleanVersion}" is not a valid Semantic Version (e.g. 1.0.0, 1.2.0-beta.1).`,
          null,
          400
        );
      }

      // If version changed, verify uniqueness
      if (cleanVersion !== existing.version) {
        const collision = await ProductUpdate.findOne({ version: cleanVersion, _id: { $ne: id } });
        if (collision) {
          return errorResponse(
            res,
            `Version ${cleanVersion} is already used by another release.`,
            null,
            409
          );
        }
        existing.version = cleanVersion;
      }
    }

    if (title) existing.title = title.trim();
    if (description) existing.description = description.trim();

    if (status) {
      if (status === 'published' && (!Array.isArray(slides) || slides.length === 0)) {
        return errorResponse(
          res,
          'Cannot publish an update without at least one carousel slide.',
          null,
          400
        );
      }
      if (status === 'published' && !existing.publishedAt) {
        existing.publishedAt = new Date();
      }
      existing.status = status;
    }

    // Identify old Cloudinary public IDs that were removed in the new slides list
    const oldPublicIds = existing.slides
      .map(s => s.cloudinaryPublicId)
      .filter(Boolean);

    const incomingPublicIds = new Set(
      (slides || []).map(s => s.cloudinaryPublicId).filter(Boolean)
    );

    const removedPublicIds = oldPublicIds.filter(id => !incomingPublicIds.has(id));

    // Process new slides
    const formattedSlides = (slides || []).map((slide, idx) => ({
      title: slide.title?.trim() || `Feature ${idx + 1}`,
      description: slide.description?.trim() || '',
      imageUrl: slide.imageUrl?.trim() || '',
      cloudinaryPublicId: slide.cloudinaryPublicId?.trim() || '',
      order: typeof slide.order === 'number' ? slide.order : idx
    }));

    for (let i = 0; i < formattedSlides.length; i++) {
      const slide = formattedSlides[i];
      if (!slide.imageUrl) {
        return errorResponse(
          res,
          `Slide #${i + 1} is missing an image. Please upload a slide image before saving.`,
          null,
          400
        );
      }
    }

    existing.slides = formattedSlides;
    await existing.save();

    // Asynchronously delete removed images from Cloudinary
    if (removedPublicIds.length > 0) {
      Promise.allSettled(
        removedPublicIds.map(publicId => deleteImageByPublicId(publicId))
      ).catch(err => {
        console.warn('[Cloudinary Cleanup Warning]:', err.message);
      });
    }

    return successResponse(res, 'Product update saved successfully.', existing);
  } catch (error) {
    return errorResponse(res, 'Failed to update product update.', error.message, 500);
  }
};

/**
 * PATCH /api/admin/product-updates/:id/status
 * Quickly toggle or change status
 */
export const updateProductUpdateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'published', 'unpublished'].includes(status)) {
      return errorResponse(
        res,
        'Invalid status. Allowed values: draft, published, unpublished.',
        null,
        400
      );
    }

    const update = await ProductUpdate.findById(id);
    if (!update) {
      return errorResponse(res, 'Product update not found.', null, 404);
    }

    if (status === 'published' && (!update.slides || update.slides.length === 0)) {
      return errorResponse(
        res,
        'Cannot publish an update that has no carousel slides. Please add slides first.',
        null,
        400
      );
    }

    update.status = status;
    if (status === 'published' && !update.publishedAt) {
      update.publishedAt = new Date();
    }
    await update.save();

    return successResponse(res, `Update status changed to ${status}.`, update);
  } catch (error) {
    return errorResponse(res, 'Failed to change update status.', error.message, 500);
  }
};

/**
 * DELETE /api/admin/product-updates/:id
 * Delete update, its associated Cloudinary images, and seen tracking records
 */
export const deleteProductUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const update = await ProductUpdate.findById(id);

    if (!update) {
      return errorResponse(res, 'Product update not found.', null, 404);
    }

    // Collect all Cloudinary public IDs
    const publicIds = update.slides
      .map(s => s.cloudinaryPublicId)
      .filter(Boolean);

    // Delete associated seen tracking records
    await ProductUpdateSeen.deleteMany({ productUpdateId: id });

    // Delete the product update
    await ProductUpdate.findByIdAndDelete(id);

    // Clean up Cloudinary assets
    if (publicIds.length > 0) {
      Promise.allSettled(
        publicIds.map(publicId => deleteImageByPublicId(publicId))
      ).catch(err => {
        console.warn('[Cloudinary Cleanup Warning on Delete]:', err.message);
      });
    }

    return successResponse(res, `Product update v${update.version} deleted successfully.`);
  } catch (error) {
    return errorResponse(res, 'Failed to delete product update.', error.message, 500);
  }
};

/**
 * POST /api/admin/product-updates/upload-image
 * Upload slide image directly to Cloudinary
 */
export const uploadSlideImageHandler = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No image file uploaded. Please choose an image.', null, 400);
    }

    if (!isCloudinaryConfigured()) {
      return errorResponse(
        res,
        'Cloudinary credentials are not configured in the server environment (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). Please configure them in server/.env to enable slide image uploads.',
        null,
        503
      );
    }

    const uploadResult = await uploadImageBuffer(req.file.buffer);

    return successResponse(res, 'Image uploaded successfully to Cloudinary.', {
      secureUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes
    });
  } catch (error) {
    return errorResponse(res, error.message || 'Image upload failed.', error.message, 500);
  }
};

/**
 * DELETE /api/admin/product-updates/image
 * Delete an uploaded image from Cloudinary (e.g. if user replaces or removes a draft slide)
 */
export const deleteSlideImageHandler = async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return errorResponse(res, 'Image public ID is required.', null, 400);
    }

    const result = await deleteImageByPublicId(publicId);
    return successResponse(res, 'Image removed from Cloudinary.', result);
  } catch (error) {
    return errorResponse(res, 'Failed to delete image.', error.message, 500);
  }
};

/**
 * GET /api/product-updates/unseen
 * Retrieves the latest published product update that the authenticated user has not yet seen
 */
export const getUnseenProductUpdate = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;

    // Find the latest published product update
    const latestPublished = await ProductUpdate.findOne({ status: 'published' })
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    if (!latestPublished) {
      return successResponse(res, 'No published updates found.', {
        hasUnseen: false,
        update: null
      });
    }

    // If user is authenticated, check if this update was already marked as seen
    if (userId) {
      const alreadySeen = await ProductUpdateSeen.findOne({
        userId,
        productUpdateId: latestPublished._id
      });

      if (alreadySeen) {
        return successResponse(res, 'User has already seen this update.', {
          hasUnseen: false,
          update: null
        });
      }
    }

    // Return the unseen update
    return successResponse(res, 'Unseen product update found.', {
      hasUnseen: true,
      update: latestPublished
    });
  } catch (error) {
    return errorResponse(res, 'Failed to check product updates.', error.message, 500);
  }
};

/**
 * POST /api/product-updates/:id/seen
 * Mark a product update as seen by the authenticated user
 */
export const markProductUpdateSeen = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user._id : null;

    if (!userId) {
      return errorResponse(res, 'Authentication required to acknowledge update.', null, 401);
    }

    const update = await ProductUpdate.findById(id);
    if (!update) {
      return errorResponse(res, 'Product update not found.', null, 404);
    }

    // Upsert the seen record so duplicate requests are idempotent
    await ProductUpdateSeen.findOneAndUpdate(
      { userId, productUpdateId: id },
      {
        userId,
        productUpdateId: id,
        version: update.version,
        seenAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return successResponse(res, `Product update v${update.version} marked as seen.`);
  } catch (error) {
    return errorResponse(res, 'Failed to record product update view.', error.message, 500);
  }
};

export default {
  getAdminProductUpdates,
  getAdminProductUpdateById,
  createProductUpdate,
  updateProductUpdate,
  updateProductUpdateStatus,
  deleteProductUpdate,
  uploadSlideImageHandler,
  deleteSlideImageHandler,
  getUnseenProductUpdate,
  markProductUpdateSeen
};
