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

      await transcribeClient.send(new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: "en-US",
        MediaFormat: mediaFormat === 'mp4' ? 'mp4' : (mediaFormat === 'wav' ? 'wav' : 'mp3'),
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

      console.log(`Transcript extracted (${transcriptText.length} chars). Invoking Amazon Bedrock...`);

      // 4. Send Transcript to Amazon Bedrock (Claude 3 Haiku)
      const prompt = `You are an expert executive meeting assistant. Analyze the following meeting transcript and respond ONLY with a raw JSON object (no markdown, no backticks, no code blocks) containing these exact fields:
- summary: string (concise summary of the meeting)
- keyPoints: string[] (list of important points discussed)
- decisions: string[] (list of key decisions made)
- risks: string[] (list of potential risks or concerns raised)
- unresolvedQuestions: string[] (open questions that need follow-up)
- actionItems: object[] (each having: "task", "assigned_to", "deadline", "priority" [High/Medium/Low])

Transcript:
${transcriptText}`;

      const bedrockPayload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000,
        messages: [
          { role: "user", content: prompt }
        ]
      };

      const bedrockRes = await bedrockClient.send(new InvokeModelCommand({
        modelId: "anthropic.claude-3-haiku-20240307-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(bedrockPayload)
      }));

      const bedrockResponseText = new TextDecoder().decode(bedrockRes.body);
      const bedrockData = JSON.parse(bedrockResponseText);
      const rawContent = bedrockData.content[0].text.trim();

      // Clean markdown codeblocks if model wraps output
      const jsonString = rawContent.replace(/^```json/, '').replace(/```$/, '').trim();
      const intelligence = JSON.parse(jsonString);

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
