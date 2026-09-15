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

// Profile image filter: allows PNG, JPG, JPEG, WEBP up to 5 MB
const profileImageFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Please upload a valid profile image (PNG, JPG, JPEG, or WEBP under 5MB).'),
      false
    );
  }
};

const profileImageMulter = multer({
  storage,
  fileFilter: profileImageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB maximum
  }
});

export const uploadProfileImage = (req, res, next) => {
  profileImageMulter.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ])(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Profile image must be less than 5 MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Please upload a valid profile image.'
      });
    }

    if (req.files?.profileImage?.[0]) {
      req.file = req.files.profileImage[0];
    } else if (req.files?.image?.[0]) {
      req.file = req.files.image[0];
    }

    next();
  });
};

export default uploadSlideImage;

