import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  duration: {
    type: Number, // in seconds or minutes
  },
  audioUrl: {
    type: String,
  },
  transcriptUrl: {
    type: String,
  },
  status: {
    type: String,
    enum: ['UPLOADING', 'PROCESSING', 'TRANSCRIBING', 'SUMMARIZING', 'COMPLETED', 'FAILED'],
    default: 'UPLOADING',
  },
  summary: {
    type: String,
  },
  keyPoints: [String],
  decisions: [String],
  risks: [String],
  unresolvedQuestions: [String],
}, { timestamps: true });

export default mongoose.model('Meeting', meetingSchema);
