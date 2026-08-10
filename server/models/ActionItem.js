import mongoose from 'mongoose';

const actionItemSchema = new mongoose.Schema({
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  task: {
    type: String,
    required: true,
  },
  assignedTo: {
    type: String,
  },
  deadline: {
    type: String,
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['TODO', 'IN PROGRESS', 'COMPLETED'],
    default: 'TODO',
  },
}, { timestamps: true });

export default mongoose.model('ActionItem', actionItemSchema);
