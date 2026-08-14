import express from 'express';
import auth from '../middleware/auth.js';
import {
  getUploadUrl,
  updateMeetingStatus,
  getMeetings,
  getMeetingById,
  meetingWebhook,
  searchMeetings,
  deleteMeeting,
  chatWithMeeting,
  resendActionEmails
} from '../controllers/meetingController.js';

const router = express.Router();

// @route   POST /api/meetings/upload-url
// @desc    Generate a presigned S3 URL for uploading a meeting recording
// @access  Private
router.post('/upload-url', auth, getUploadUrl);

// @route   PUT /api/meetings/:id/status
// @desc    Update meeting status (called by frontend after successful upload)
// @access  Private
router.put('/:id/status', auth, updateMeetingStatus);

// @route   GET /api/meetings/search
// @desc    Search user's meetings by keyword
// @access  Private
router.get('/search', auth, searchMeetings);

// @route   GET /api/meetings
// @desc    Get all meetings for user
// @access  Private
router.get('/', auth, getMeetings);

// @route   GET /api/meetings/:id
// @desc    Get single meeting by ID
// @access  Private
router.get('/:id', auth, getMeetingById);

// @route   DELETE /api/meetings/:id
// @desc    Delete meeting and associated action items
// @access  Private
router.delete('/:id', auth, deleteMeeting);

// @route   POST /api/meetings/:id/chat
// @desc    Chat with meeting transcript using Gemini RAG
// @access  Private
router.post('/:id/chat', auth, chatWithMeeting);

// @route   POST /api/meetings/:id/resend-emails
// @desc    Manually resend action item emails to attendees
// @access  Private
router.post('/:id/resend-emails', auth, resendActionEmails);

// @route   POST /api/meetings/webhook
// @desc    Webhook for AWS Lambda to send processed meeting intelligence
// @access  Public (in production, secure this with API keys)
router.post('/webhook', meetingWebhook);

export default router;
