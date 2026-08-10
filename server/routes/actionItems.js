import express from 'express';
import auth from '../middleware/auth.js';
import {
  getActionItems,
  getActionItemsByMeeting,
  updateActionItemStatus
} from '../controllers/actionItemController.js';

const router = express.Router();

// @route   GET /api/action-items
// @desc    Get all action items for a user
// @access  Private
router.get('/', auth, getActionItems);

// @route   GET /api/action-items/meeting/:meetingId
// @desc    Get action items for a specific meeting
// @access  Private
router.get('/meeting/:meetingId', auth, getActionItemsByMeeting);

// @route   PUT /api/action-items/:id/status
// @desc    Update status of an action item
// @access  Private
router.put('/:id/status', auth, updateActionItemStatus);

export default router;
