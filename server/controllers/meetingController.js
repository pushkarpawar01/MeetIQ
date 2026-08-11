import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Meeting from '../models/Meeting.js';
import ActionItem from '../models/ActionItem.js';
import s3Client from '../config/aws.js';

export const getUploadUrl = async (req, res) => {
  try {
    const { title, filename, contentType } = req.body;
    
    if (!title || !filename) {
      return res.status(400).json({ message: 'Title and filename are required' });
    }

    // Create meeting record with UPLOADING status
    const meeting = new Meeting({
      userId: req.user.id,
      title,
      status: 'UPLOADING'
    });
    
    await meeting.save();
    
    const s3Key = `meeting-audio/${req.user.id}/${meeting._id}/${filename}`;
    
    // Update meeting with the S3 file URL that it WILL have
    meeting.audioUrl = `s3://${process.env.AWS_S3_BUCKET_NAME || 'meetiq-uploads'}/${s3Key}`;
    await meeting.save();

    // Generate pre-signed URL
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME || 'meetiq-uploads',
      Key: s3Key,
      ContentType: contentType || 'audio/mpeg'
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

    res.json({
      meetingId: meeting._id,
      uploadUrl: signedUrl,
      fileUrl: meeting.audioUrl
    });
  } catch (err) {
    console.error('Error generating presigned URL:', err);
    res.status(500).send('Server error');
  }
};

export const updateMeetingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    let meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    
    // Ensure user owns meeting
    if (meeting.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    meeting.status = status;
    await meeting.save();

    res.json(meeting);
  } catch (err) {
    console.error('Error updating meeting status:', err);
    res.status(500).send('Server error');
  }
};

export const getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(meetings);
  } catch (err) {
    console.error('Error fetching meetings:', err);
    res.status(500).send('Server error');
  }
};

export const getMeetingById = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    
    if (meeting.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(meeting);
  } catch (err) {
    console.error('Error fetching meeting:', err);
    res.status(500).send('Server error');
  }
};

export const meetingWebhook = async (req, res) => {
  try {
    const { meetingId, summary, keyPoints, decisions, risks, unresolvedQuestions, actionItems } = req.body;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    meeting.summary = summary;
    meeting.keyPoints = keyPoints || [];
    meeting.decisions = decisions || [];
    meeting.risks = risks || [];
    meeting.unresolvedQuestions = unresolvedQuestions || [];
    meeting.status = 'COMPLETED';

    await meeting.save();

    // Create action items
    if (actionItems && actionItems.length > 0) {
      const itemsToInsert = actionItems.map(item => ({
        meetingId: meeting._id,
        userId: meeting.userId,
        task: item.task,
        assignedTo: item.assigned_to,
        deadline: item.deadline,
        priority: item.priority === 'High' ? 'High' : (item.priority === 'Low' ? 'Low' : 'Medium'),
        status: 'TODO'
      }));
      
      await ActionItem.insertMany(itemsToInsert);
    }

    res.json({ message: 'Meeting intelligence updated successfully' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Server error');
  }
};

export const searchMeetings = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      const meetings = await Meeting.find({ userId: req.user.id }).sort({ date: -1 });
      return res.json(meetings);
    }
    
    const regex = new RegExp(query, 'i');
    
    const meetings = await Meeting.find({
      userId: req.user.id,
      $or: [
        { title: regex },
        { summary: regex },
        { keyPoints: regex },
        { decisions: regex },
        { risks: regex }
      ]
    }).sort({ date: -1 });

    res.json(meetings);
  } catch (err) {
    console.error('Error searching meetings:', err);
    res.status(500).send('Server error');
  }
};

export const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    if (meeting.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Delete associated action items
    await ActionItem.deleteMany({ meetingId: meeting._id });

    // Delete meeting from DB
    await Meeting.findByIdAndDelete(req.params.id);

    res.json({ message: 'Meeting deleted successfully' });
  } catch (err) {
    console.error('Error deleting meeting:', err);
    res.status(500).send('Server error');
  }
};

