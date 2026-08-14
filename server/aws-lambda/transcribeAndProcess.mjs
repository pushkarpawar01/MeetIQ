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

      // Truncate transcript if extremely long (Gemini 1.5 Flash has a massive 1M token context, but we keep it reasonable)
      const truncatedTranscript = transcriptText.length > 50000
        ? transcriptText.substring(0, 50000) + "... [truncated]"
        : transcriptText;

      console.log(`Sending ${truncatedTranscript.length} chars to Gemini...`);

      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is missing. Please add it to Lambda configuration.');
      }

      // 4. Send Transcript to Google Gemini — model is configurable via GEMINI_MODEL env var
      const prompt = `You are a concise meeting assistant. Analyze this transcript and respond ONLY with a compact raw JSON object in ENGLISH with these fields:
- summary: string
- keyPoints: string[] (max 5 items)
- decisions: string[] (max 5 items)
- risks: string[] (max 3 items)
- unresolvedQuestions: string[] (max 3 items)
- actionItems: object[] (max 5 items, each: {task, assigned_to, deadline, priority})

Transcript:
${truncatedTranscript}`;

      const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite'; // Override via Lambda env var if model is retired
      console.log(`Using Gemini model: ${geminiModel}`);
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json" // Gemini guarantees valid JSON output!
          }
        })
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        throw new Error(`Gemini API error: ${geminiRes.status} ${errText}`);
      }

      const geminiData = await geminiRes.json();
      const rawContent = geminiData.candidates[0].content.parts[0].text.trim();

      console.log("Gemini raw output:", rawContent.substring(0, 300));

      const intelligence = JSON.parse(rawContent);

      if (!intelligence.summary) {
        throw new Error('Gemini returned JSON but summary field is missing. Raw: ' + rawContent.substring(0, 200));
      }

      console.log("Gemini Intelligence Extracted successfully. Sending to Webhook...");

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
      }).catch(() => { });
    }
  }

  return { statusCode: 200, body: "Processing complete" };
};
