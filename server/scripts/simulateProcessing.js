import fetch from 'node-fetch'; // Make sure to npm install node-fetch if using Node < 18, but Node 18+ has native fetch

const simulateWebhook = async (meetingId) => {
  try {
    const payload = {
      meetingId,
      summary: "The team discussed the upcoming backend deployment. It was decided that ECS (Elastic Container Service) is the best choice for this project due to its scalability. Rahul raised a concern about the short deadline, so the priority is to get the base configuration done by Friday.",
      keyPoints: [
        "Backend deployment strategy discussed.",
        "Agreed to migrate from current setup to AWS ECS.",
        "Short deadline identified as a potential risk."
      ],
      decisions: [
        "Use AWS ECS for the backend deployment.",
        "Enable CloudWatch for monitoring."
      ],
      risks: [
        "Deployment deadline is very short (Friday)."
      ],
      unresolvedQuestions: [
        "Which specific ECS configuration (EC2 vs Fargate) should be used?"
      ],
      actionItems: [
        {
          task: "Create base ECS deployment configuration",
          assigned_to: "Rahul",
          deadline: "Friday",
          priority: "High"
        },
        {
          task: "Configure CloudWatch monitoring",
          assigned_to: "DevOps Team",
          deadline: "Next Monday",
          priority: "Medium"
        }
      ]
    };

    const res = await fetch('http://localhost:5000/api/meetings/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log('✅ Webhook triggered successfully. Meeting is now processed!');
    } else {
      console.log('❌ Webhook failed:', await res.text());
    }
  } catch (err) {
    console.error('Error:', err);
  }
};

// Pass meeting ID as argument
const meetingId = process.argv[2];
if (!meetingId) {
  console.log('Please provide a meeting ID. Usage: node simulateProcessing.js <meeting_id>');
  process.exit(1);
}

simulateWebhook(meetingId);
