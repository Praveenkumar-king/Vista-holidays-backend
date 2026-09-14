import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
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

const timelineSchema = new mongoose.Schema({
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

const contactMessageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true,
      index: true
    },
    mobile: {
      type: String,
      trim: true,
      default: ''
    },
    country: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    queryType: {
      type: String,
      required: [true, 'Query type is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true
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
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
      index: true
    },
    messages: [messageSchema],
    timeline: [timelineSchema]
  },
  {
    timestamps: true
  }
);

// Format helper for public tracking (does not leak sensitive internal flags)
contactMessageSchema.methods.toPublicTrackObject = function () {
  return {
    ticketId: this.ticketId,
    requestType: 'Contact Request',
    name: this.name,
    email: this.email,
    queryType: this.queryType,
    status: this.status,
    messages: this.messages,
    timeline: this.timeline,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

export default ContactMessage;
