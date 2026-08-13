import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const s3Client = new S3Client({});
const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" }); // Nova models have best support in us-east-1

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://YOUR_SERVER_IP:5000/api/meetings/webhook";
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

export const handler = async (event) => {
  console.log("Processing S3 Event:", JSON.stringify(event, null, 2));

  if (!ASSEMBLYAI_API_KEY) {
    console.error("CRITICAL: ASSEMBLYAI_API_KEY environment variable is missing.");
    return { statusCode: 500, body: "Missing AssemblyAI Key" };
  }

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    // Key format: meeting-audio/<userId>/<meetingId>/<filename>
    const keyParts = key.split('/');
    if (keyParts.length < 4) {
      console.log(`Skipping non-meeting file: ${key}`);
      continue;
    }
    const meetingId = keyParts[2];

    try {
      console.log(`Generating Pre-Signed URL for AssemblyAI...`);

      // 1. Generate a temporary public URL so AssemblyAI can download the audio from S3
      const s3Command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const presignedUrl = await getSignedUrl(s3Client, s3Command, { expiresIn: 3600 });

      console.log(`Starting AssemblyAI Transcription for meetingId: ${meetingId}`);

      // 2. Submit audio URL to AssemblyAI
      const assemblyStartRes = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "POST",
        headers: {
          "Authorization": ASSEMBLYAI_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          audio_url: presignedUrl,
          language_detection: true // Auto-detects Hindi, English, etc.
        })
      });

      if (!assemblyStartRes.ok) {
        const errText = await assemblyStartRes.text();
        throw new Error(`AssemblyAI submission failed: ${errText}`);
      }

      const { id: transcriptId } = await assemblyStartRes.json();
      console.log(`AssemblyAI job submitted. Transcript ID: ${transcriptId}`);

      // 3. Poll AssemblyAI until transcription is complete
      let status = "queued";
      let transcriptText = "";

      while (status !== "completed" && status !== "error") {
        await new Promise(r => setTimeout(r, 5000)); // wait 5 seconds between polls

        const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: { "Authorization": ASSEMBLYAI_API_KEY }
        });
        const pollData = await pollRes.json();
        status = pollData.status;
        console.log(`AssemblyAI status: ${status}`);

        if (status === "completed") {
          transcriptText = pollData.text;
        } else if (status === "error") {
          throw new Error(`AssemblyAI transcription failed: ${pollData.error}`);
        }
      }

      // Truncate transcript to limit input tokens (free tier has daily limit)
      const truncatedTranscript = transcriptText.length > 3000
        ? transcriptText.substring(0, 3000) + "... [truncated]"
        : transcriptText;

      console.log(`Sending ${truncatedTranscript.length} chars to Bedrock...`);

      // 4. Send Transcript to Amazon Bedrock (Amazon Nova Lite)
      const prompt = `You are a concise meeting assistant. Analyze this transcript and respond ONLY with a compact raw JSON object in ENGLISH (no markdown, no backticks) with these fields:
- summary: string
- keyPoints: string[] (max 5 items)
- decisions: string[] (max 5 items)
- risks: string[] (max 3 items)
- unresolvedQuestions: string[] (max 3 items)
- actionItems: object[] (max 5 items, each: {task, assigned_to, deadline, priority})

Transcript:
${truncatedTranscript}`;

      // Amazon Nova Lite — current-generation AWS model (Titan Express is deprecated)
      const bedrockPayload = {
        messages: [
          {
            role: "user",
            content: [{ text: prompt }]
          }
        ],
        inferenceConfig: {
          maxTokens: 700, // Reduced to stay within free tier daily limits
          temperature: 0.3,
          topP: 0.9
        }
      };

      const bedrockRes = await bedrockClient.send(new InvokeModelCommand({
        modelId: "us.amazon.nova-lite-v1:0", // us-east-1 cross-region inference profile
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(bedrockPayload)
      }));

      const bedrockResponseText = new TextDecoder().decode(bedrockRes.body);
      const bedrockData = JSON.parse(bedrockResponseText);
      const rawContent = bedrockData.output.message.content[0].text.trim();

      console.log("Bedrock raw output:", rawContent.substring(0, 300));

      // Robust JSON extraction — Titan sometimes wraps output in explanatory text
      let jsonString = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      if (!jsonString.startsWith('{')) {
        const match = rawContent.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('Bedrock did not return a valid JSON object. Raw: ' + rawContent.substring(0, 200));
        jsonString = match[0];
      }

      const intelligence = JSON.parse(jsonString);

      if (!intelligence.summary) {
        throw new Error('Bedrock returned JSON but summary field is missing. Raw: ' + rawContent.substring(0, 200));
      }

      console.log("Bedrock Intelligence Extracted successfully. Sending to Webhook...");

      // 5. Send the final payload to the MeetIQ backend webhook
      const webhookPayload = { meetingId, ...intelligence };

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });

      if (!res.ok) {
        throw new Error(`Webhook request failed with status: ${res.status}`);
      }

      console.log(`Successfully updated meeting ${meetingId} intelligence!`);

    } catch (err) {
      console.error(`Error processing meeting ${meetingId}:`, err);
      // Send failure status back to webhook so UI doesn't get stuck in PROCESSING
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, status: 'FAILED' })
      }).catch(() => {});
    }
  }

  return { statusCode: 200, body: "Processing complete" };
};
