import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Meeting from '../models/Meeting.js';
import ActionItem from '../models/ActionItem.js';
import User from '../models/User.js';
import s3Client from '../config/aws.js';
import { sendActionItemEmail } from '../utils/mailer.js';

// Shared helper — resolves assignedTo name → attendee email and fires notifications
const sendEmailsForActionItems = async (items, meeting) => {
  console.log(`📧 Email task: processing ${items.length} action items for meeting "${meeting.title}"`);
  console.log(`📋 Meeting has ${(meeting.attendees || []).length} attendees:`, (meeting.attendees || []).map(a => `${a.name} <${a.email}>`));

  for (const item of items) {
    const name = item.assignedTo;
    if (!name || name.toLowerCase() === 'none' || name.toLowerCase() === 'tbd') {
      console.log(`ℹ️  Skipping email — assignedTo is "${name}"`);
      continue;
    }

    let emailToSend = name;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name);

    if (!isEmail) {
      // Look up name in attendees list (case-insensitive, partial match too)
      const attendee = (meeting.attendees || []).find(a =>
        a.name && a.name.toLowerCase().includes(name.toLowerCase())
      );

      if (attendee && attendee.email) {
        emailToSend = attendee.email;
        console.log(`✅ Matched "${name}" → ${emailToSend}`);
      } else {
        console.log(`⚠️  No attendee matched "${name}". Available: ${(meeting.attendees || []).map(a => a.name).join(', ') || 'none'}`);
        continue;
      }
    }

    await sendActionItemEmail(emailToSend, item.task, meeting.title);
  }
};

export const getUploadUrl = async (req, res) => {
  try {
    const { title, filename, contentType, attendees } = req.body;
    
    if (!title || !filename) {
      return res.status(400).json({ message: 'Title and filename are required' });
    }

    // Create meeting record with UPLOADING status
    const meeting = new Meeting({
      userId: req.user.id,
      title,
      status: 'UPLOADING',
      attendees: attendees || []
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
    const { meetingId, status, summary, keyPoints, decisions, risks, unresolvedQuestions, actionItems, transcriptText } = req.body;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    // Lambda signals explicit failure
    if (status === 'FAILED' || !summary) {
      meeting.status = 'FAILED';
      await meeting.save();
      return res.json({ message: 'Meeting marked as FAILED' });
    }

    meeting.summary = summary;
    meeting.keyPoints = keyPoints || [];
    meeting.decisions = decisions || [];
    meeting.risks = risks || [];
    meeting.unresolvedQuestions = unresolvedQuestions || [];
    if (transcriptText) meeting.transcriptText = transcriptText;
    meeting.status = 'COMPLETED';

    await meeting.save();

    // Create action items and send emails
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

      // Fire emails asynchronously — don't block webhook response
      sendEmailsForActionItems(itemsToInsert, meeting).catch(err =>
        console.error('Background email error:', err)
      );
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

export const chatWithMeeting = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ message: 'Question is required' });

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    if (meeting.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY is not configured on the server.' });
    }

    // Use full transcript if available, otherwise fall back to summary + key points
    let context;
    if (meeting.transcriptText) {
      context = `Full Transcript:\n${meeting.transcriptText}`;
    } else if (meeting.summary) {
      // Fallback for meetings processed before the transcript-saving feature
      context = `Meeting Summary:\n${meeting.summary}\n\nKey Points:\n${(meeting.keyPoints || []).join('\n')}\n\nDecisions:\n${(meeting.decisions || []).join('\n')}`;
    } else {
      return res.status(400).json({ message: 'This meeting has not been processed yet. Please wait for AI processing to complete.' });
    }

    const prompt = `You are an AI assistant answering questions about a meeting.
Answer the user's question accurately using ONLY the information from the meeting context below.
If the answer is not available, say "I cannot find the answer in the meeting data."

${context}

Question: ${question}`;

    // Use the same model configured in env, matching the Lambda pipeline
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!geminiRes.ok) {
      // Return the actual Gemini error to help debug
      const errBody = await geminiRes.text();
      console.error('Gemini API error body:', errBody);
      return res.status(500).json({ message: `Gemini API error ${geminiRes.status}: ${errBody}` });
    }

    const data = await geminiRes.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      return res.status(500).json({ message: 'Gemini returned an empty response.' });
    }

    res.json({ answer });
  } catch (err) {
    console.error('Error in chatWithMeeting:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// POST /api/meetings/:id/resend-emails
// Manually re-trigger action item emails for an existing completed meeting
export const resendActionEmails = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    if (meeting.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!meeting.attendees || meeting.attendees.length === 0) {
      return res.status(400).json({ message: 'This meeting has no attendees saved.' });
    }

    const actionItems = await ActionItem.find({ meetingId: meeting._id });
    if (actionItems.length === 0) {
      return res.status(400).json({ message: 'No action items found for this meeting.' });
    }

    // Re-use the same shared helper
    await sendEmailsForActionItems(actionItems, meeting);

    res.json({ message: `Emails re-sent for ${actionItems.length} action items.` });
  } catch (err) {
    console.error('Error in resendActionEmails:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};


