import nodemailer from 'nodemailer';

// EMAIL_SERVICE=gmail
// EMAIL_USER=your_email@gmail.com
// EMAIL_PASS=your_app_password
export const sendActionItemEmail = async (assignedTo, task, meetingTitle) => {
  try {
    // Basic validation to ensure the assigned name looks like an email address.
    // If Gemini just returns "John", we can't email "John". It must be "john@example.com".
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assignedTo);
    if (!isEmail) {
      console.log(`⚠️ Cannot send email to "${assignedTo}" - not a valid email address.`);
      return;
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`⚠️ Email credentials not found in .env. Skipping real email to ${assignedTo}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

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

    console.log(`✉️ Real email successfully sent to ${assignedTo}!`);
  } catch (err) {
    console.error('Failed to send real email:', err);
  }
};
