import multer from 'multer';

// Use in-memory buffer storage so files stream directly to Cloudinary without touching disk
const storage = multer.memoryStorage();

// File filter: only accept valid image MIME types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file format: ${file.mimetype}. Only JPEG, PNG, WEBP, GIF, and SVG images are allowed.`
      ),
      false
    );
  }
};

export const uploadSlideImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB maximum
  }
}).single('image');

export default uploadSlideImage;
