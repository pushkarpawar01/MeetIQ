import nodemailer from 'nodemailer';

// EMAIL_SERVICE=gmail
// EMAIL_USER=your_email@gmail.com
// EMAIL_PASS=vazr eiun oily btkj   (spaces are fine, we strip them automatically)

const createTransporter = () => {
  const rawPass = process.env.EMAIL_PASS || '';
  // Gmail App Passwords are 16 chars with optional spaces — strip them
  const cleanPass = rawPass.replace(/\s/g, '');

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: cleanPass,
    },
  });
};

export const sendActionItemEmail = async (assignedTo, task, meetingTitle) => {
  try {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assignedTo);
    if (!isEmail) {
      console.log(`⚠️ Cannot send email to "${assignedTo}" - not a valid email address.`);
      return;
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`⚠️ Email credentials not found in .env. Skipping email to ${assignedTo}`);
      return;
    }

    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"MeetIQ Assistant" <${process.env.EMAIL_USER}>`,
      to: assignedTo,
      subject: `New Action Item: ${meetingTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #4f46e5;">New Action Item Assigned!</h2>
          <p>You have a new task assigned from the meeting: <strong>${meetingTitle}</strong></p>
          <div style="background: #f9fafb; padding: 15px; border-left: 4px solid #4f46e5; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;"><strong>Task:</strong> ${task}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Log in to your MeetIQ dashboard to update its status.</p>
        </div>
      `,
    });

    console.log(`✉️ Email successfully sent to ${assignedTo}!`);
  } catch (err) {
    console.error(`❌ Failed to send email to ${assignedTo}:`, err.message);
  }
};

// Used by the test route to verify credentials work
export const sendTestEmail = async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be set in .env');
  }

  const transporter = createTransporter();

  // Verify connection first — throws if credentials are wrong
  await transporter.verify();

  await transporter.sendMail({
    from: `"MeetIQ Assistant" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER, // Send to yourself as a test
    subject: 'MeetIQ Email Test',
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #4f46e5;">✅ Email is working!</h2>
        <p>Your MeetIQ action item notifications are configured correctly.</p>
      </div>
    `,
  });
};
