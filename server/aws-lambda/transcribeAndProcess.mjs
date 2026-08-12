import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const transcribeClient = new TranscribeClient({});
const bedrockClient = new BedrockRuntimeClient({});

// Configure your backend API endpoint (e.g. https://your-domain.com or http://YOUR_SERVER_IP:5000)
const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://YOUR_SERVER_IP:5000/api/meetings/webhook";

export const handler = async (event) => {
  console.log("Processing S3 Event:", JSON.stringify(event, null, 2));

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
    const jobName = `meetiq-${meetingId}-${Date.now()}`;

    try {
      console.log(`Starting Transcribe job for meetingId: ${meetingId}`);

      // 1. Start Amazon Transcribe Job
      const fileUri = `s3://${bucket}/${key}`;
      const mediaFormat = key.substring(key.lastIndexOf('.') + 1).toLowerCase();

      // Detect format — Transcribe supports mp3, mp4, wav, flac, ogg, webm, amr
      const supportedFormats = ['mp3', 'mp4', 'wav', 'flac', 'ogg', 'webm', 'amr'];
      const resolvedFormat = supportedFormats.includes(mediaFormat) ? mediaFormat : 'mp4';

      await transcribeClient.send(new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        // Auto-detect language — supports Hindi (hi-IN), English, and 100+ others
        IdentifyLanguage: true,
        LanguageOptions: ["en-US", "hi-IN", "en-IN", "en-GB"],
        MediaFormat: resolvedFormat,
        Media: { MediaFileUri: fileUri }
      }));

      // 2. Poll until Transcribe Job Completes
      let jobStatus = "IN_PROGRESS";
      let transcriptUrl = "";
      while (jobStatus === "IN_PROGRESS") {
        await new Promise(r => setTimeout(r, 5000)); // wait 5s
        const statusRes = await transcribeClient.send(new GetTranscriptionJobCommand({
          TranscriptionJobName: jobName
        }));
        jobStatus = statusRes.TranscriptionJob.TranscriptionJobStatus;

        if (jobStatus === "COMPLETED") {
          transcriptUrl = statusRes.TranscriptionJob.Transcript.TranscriptFileUri;
        } else if (jobStatus === "FAILED") {
          throw new Error(`Transcribe failed: ${statusRes.TranscriptionJob.FailureReason}`);
        }
      }

      console.log(`Transcription completed. Fetching transcript JSON...`);

      // 3. Fetch Transcript JSON text
      const transcriptRes = await fetch(transcriptUrl);
      const transcriptData = await transcriptRes.json();
      const transcriptText = transcriptData.results.transcripts[0].transcript;

      console.log(`Transcript extracted (${transcriptText.length} chars). Invoking Amazon Bedrock (Titan)...`);

      // 4. Send Transcript to Amazon Bedrock (Amazon Titan — no subscription required)
      // Note: The transcript may be in any language (Hindi, English, etc.).
      // Instruct Bedrock to ALWAYS respond with the JSON fields in English.
      const prompt = `You are an expert executive meeting assistant. The following transcript may be in any language (e.g. Hindi, English, etc.).
Analyze it and respond ONLY with a raw JSON object written in ENGLISH (no markdown, no backticks, no code blocks) containing these exact fields:
- summary: string (concise summary of the meeting, in English)
- keyPoints: string[] (list of important points discussed, in English)
- decisions: string[] (list of key decisions made, in English)
- risks: string[] (list of potential risks or concerns raised, in English)
- unresolvedQuestions: string[] (open questions that need follow-up, in English)
- actionItems: object[] (each having: "task", "assigned_to", "deadline", "priority" [High/Medium/Low], all in English)

Transcript:
${transcriptText}`;

      const bedrockPayload = {
        inputText: prompt,
        textGenerationConfig: {
          maxTokenCount: 2000,
          temperature: 0.3,
          topP: 0.9
        }
      };

      const bedrockRes = await bedrockClient.send(new InvokeModelCommand({
        modelId: "amazon.titan-text-express-v1",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(bedrockPayload)
      }));

      const bedrockResponseText = new TextDecoder().decode(bedrockRes.body);
      const bedrockData = JSON.parse(bedrockResponseText);
      const rawContent = bedrockData.results[0].outputText.trim();

      console.log("Bedrock raw output:", rawContent.substring(0, 300));

      // Robust JSON extraction — Titan sometimes wraps JSON in explanatory text
      // Try 1: strip markdown fences
      let jsonString = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

      // Try 2: extract first { ... } block if still not valid JSON
      if (!jsonString.startsWith('{')) {
        const match = rawContent.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('Bedrock did not return a valid JSON object. Raw output: ' + rawContent.substring(0, 200));
        jsonString = match[0];
      }

      const intelligence = JSON.parse(jsonString);

      // Validate minimum required fields
      if (!intelligence.summary) {
        throw new Error('Bedrock returned JSON but summary field is missing or empty. Raw: ' + rawContent.substring(0, 200));
      }

      console.log("Bedrock Intelligence Extracted successfully. Sending to Webhook...");

      // 5. Send payload to MeetIQ Webhook
      const webhookPayload = {
        meetingId,
        ...intelligence
      };

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
      // Optional: Post failure status back to webhook
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, status: 'FAILED' })
      }).catch(() => {});
    }
  }

  return { statusCode: 200, body: "Processing complete" };
};
