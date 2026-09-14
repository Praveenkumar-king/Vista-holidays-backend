import mongoose from 'mongoose';

const feedbackMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['admin', 'user', 'system'],
    default: 'admin'
  },
  senderName: {
    type: String,
    default: 'Vista Holidays Support Team'
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const feedbackTimelineSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const feedbackSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      index: true
    },
    mobile: {
      type: String,
      trim: true,
      default: ''
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    // Dynamically stores all questionnaire answers
    answers: {
      type: Map,
      of: String,
      default: {}
    },
    termsAccepted: {
      type: Boolean,
      default: true
    },
    ipAddress: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['New', 'Reviewed', 'Resolved', 'Closed'],
      default: 'New',
      index: true
    },
    messages: [feedbackMessageSchema],
    timeline: [feedbackTimelineSchema]
  },
  {
    timestamps: true
  }
);

// Format helper for public tracking
feedbackSchema.methods.toPublicTrackObject = function () {
  return {
    ticketId: this.ticketId,
    requestType: 'Feedback Submission',
    name: this.name,
    email: this.email,
    rating: this.rating,
    status: this.status,
    messages: this.messages,
    timeline: this.timeline,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const FeedbackMessage = mongoose.model('FeedbackMessage', feedbackSchema);

export default FeedbackMessage;
