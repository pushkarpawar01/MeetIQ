# AWS AI Pipeline Setup for MeetIQ

This document provides step-by-step instructions to configure the automated AI processing pipeline using **AWS S3**, **AWS Lambda**, **Amazon Transcribe**, and **Amazon Bedrock**.

---

## Architecture Overview

```
[ User Uploads Audio ]
          │
          ▼
   [ AWS S3 Bucket ]
          │ (s3:ObjectCreated Event)
          ▼
   [ AWS Lambda ] ──▶ [ Amazon Transcribe ]
          │ (Speech to Text)
          ▼
   [ Amazon Bedrock ] (Claude 3 Haiku / Llama 3)
          │ (Extracts JSON Intelligence)
          ▼
   [ MeetIQ Webhook ] ──▶ [ MongoDB ]
```

---

## Step 1: Enable Model Access in Amazon Bedrock
1. Open the [Amazon Bedrock Console](https://console.aws.amazon.com/bedrock).
2. Ensure you are in region **`us-east-1`** or **`ap-south-1`**.
3. In the left navigation menu, click **Model access** (under *Bedrock configurations*).
4. Click **Modify model access** (or **Enable specific models**).
5. Check the box for **Claude 3 Haiku** (under *Anthropic*).
6. Click **Next** → **Submit**. Access is granted instantly.

---

## Step 2: Create IAM Role for Lambda
1. Open the [IAM Console](https://console.aws.amazon.com/iam).
2. Click **Roles** → **Create role**.
3. Trusted Entity Type: **AWS service** → Use Case: **Lambda** → Click **Next**.
4. Attach Policies:
   - Search & select: `AWSLambdaBasicExecutionRole`
5. Click **Next** → Name the role `MeetIQLambdaExecutionRole` → Click **Create role**.
6. Open `MeetIQLambdaExecutionRole` → Click **Add permissions** → **Create inline policy**:
7. Switch to the **JSON** tab and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::meetiq-uploads/*"
    },
    {
      "Sid": "TranscribeAccess",
      "Effect": "Allow",
      "Action": [
        "transcribe:StartTranscriptionJob",
        "transcribe:GetTranscriptionJob"
      ],
      "Resource": "*"
    },
    {
      "Sid": "BedrockAccess",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": "*"
    }
  ]
}
```
8. Name it `MeetIQInlinePolicy` and click **Create policy**.

---

## Step 3: Create the Lambda Function
1. Open the [AWS Lambda Console](https://console.aws.amazon.com/lambda).
2. Click **Create function**.
   - **Function name**: `meetiq-processor`
   - **Runtime**: `Node.js 20.x`
   - **Architecture**: `x86_64`
   - **Permissions**: Select *Use an existing role* → choose `MeetIQLambdaExecutionRole`.
3. Click **Create function**.

---

## Step 4: Add Lambda Code & Environment Variable
1. In the Code tab, copy & paste the content of [`transcribeAndProcess.mjs`](./transcribeAndProcess.mjs) into `index.mjs`.
2. Click **Deploy**.
3. Go to the **Configuration** tab:
   - **General configuration**: Edit → set **Timeout** to **3 minutes 0 seconds** (Transcribe + Bedrock takes 30-90s). Click Save.
   - **Environment variables**: Edit → Add variable:
     - Key: `WEBHOOK_URL`
     - Value: `http://YOUR_DEPLOYED_SERVER_IP:5000/api/meetings/webhook` *(or your ngrok / server domain)*

---

## Step 5: Configure S3 Event Trigger
1. Open the [S3 Console](https://console.aws.amazon.com/s3).
2. Click your bucket (**`meetiq-uploads`**).
3. Go to the **Properties** tab.
4. Scroll down to **Event notifications** → Click **Create event notification**:
   - **Event name**: `AudioUploadTrigger`
   - **Prefix**: `meeting-audio/`
   - **Event types**: Check **All object create events** (`s3:ObjectCreated:*`).
   - **Destination**: Select **Lambda function** → Choose `meetiq-processor`.
5. Click **Save changes**.

---

## Testing the AI Pipeline
1. Upload a meeting audio file on your MeetIQ Dashboard.
2. S3 triggers the `meetiq-processor` Lambda.
3. Transcribe converts audio to text → Bedrock extracts JSON intelligence → Webhook updates MongoDB.
4. Your MeetIQ UI instantly displays the summary, key points, decisions, risks, and action items!
