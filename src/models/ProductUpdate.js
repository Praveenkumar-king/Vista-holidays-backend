import mongoose from 'mongoose';

// Semantic Versioning regex (accepts e.g. 1.0.0, 1.2.3-beta.1)
const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

const slideSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Slide title is required'],
      trim: true,
      minlength: [2, 'Slide title must be at least 2 characters'],
      maxlength: [150, 'Slide title cannot exceed 150 characters']
    },
    description: {
      type: String,
      required: [true, 'Slide description is required'],
      trim: true,
      minlength: [5, 'Slide description must be at least 5 characters'],
      maxlength: [1000, 'Slide description cannot exceed 1000 characters']
    },
    imageUrl: {
      type: String,
      required: [true, 'Slide image URL is required'],
      trim: true
    },
    cloudinaryPublicId: {
      type: String,
      default: '',
      trim: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  { _id: true }
);

const productUpdateSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      required: [true, 'Version is required'],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return SEMVER_REGEX.test(v);
        },
        message: props => `${props.value} is not a valid Semantic Version (e.g. 1.0.0 or 2.1.0-beta.1)`
      },
      index: true
    },
    title: {
      type: String,
      required: [true, 'Main update title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Main update description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'unpublished'],
        message: '{VALUE} is not a supported status (must be draft, published, or unpublished)'
      },
      default: 'draft',
      index: true
    },
    slides: {
      type: [slideSchema],
      default: [],
      validate: {
        validator: function (slides) {
          // If status is published, must have at least 1 slide
          if (this.status === 'published') {
            return Array.isArray(slides) && slides.length > 0;
          }
          return true;
        },
        message: 'A published product update must contain at least one carousel slide.'
      }
    },
    publishedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Set publishedAt automatically when status changes to 'published'
productUpdateSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// JSON serializer transform
productUpdateSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  }
});

const ProductUpdate = mongoose.model('ProductUpdate', productUpdateSchema);

export default ProductUpdate;
