# 🚀 MeetIQ - AI-Powered Meeting Intelligence

MeetIQ is a cutting-edge web application that transforms your meeting recordings into actionable intelligence. By leveraging AWS Cloud infrastructure (S3, Lambda, Amazon Transcribe, and Amazon Bedrock), it automatically generates executive summaries, extracts key decisions, identifies risks, and tracks action items from audio and video uploads.

## 🏗️ Architecture Stack

- **Frontend**: React, Vite, Tailwind CSS v4, React Router, Lucide Icons
- **Backend**: Node.js, Express, ES Modules, JWT Authentication
- **Database**: MongoDB Atlas (Mongoose)
- **Cloud Infrastructure (AWS)**: 
  - AWS S3 (Direct presigned uploads)
  - AWS EventBridge / Lambda
  - Amazon Transcribe (Speech-to-text with Speaker Diarization)
  - Amazon Bedrock (LLM for extracting intelligence)

## 📁 Project Structure

This is a monolithic repository consisting of a frontend React application and a backend Node.js API.

- `/client` - The Vite + React frontend application.
- `/server` - The Express.js backend API.

## ⚙️ Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (Local instance or MongoDB Atlas cluster)
- AWS Account (with S3 Bucket and programmatic access keys)

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `server` directory and add the following:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/meetiq
   JWT_SECRET=supersecretjwtkey
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_S3_BUCKET_NAME=meetiq-uploads
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## 🧪 Testing the AI Integration Locally

Since AWS Lambda provisioning can be complex, a local simulation script is provided to test the application's processing capabilities without needing a live AWS environment.

1. Run both the client and server.
2. Upload a dummy meeting via the frontend Dashboard.
3. Once the meeting shows as "PROCESSING", copy its unique MongoDB ID from the URL (`http://localhost:5173/meeting/<ID>`).
4. In a new terminal, navigate to the `server` folder and run:
   ```bash
   node scripts/simulateProcessing.js <ID>
   ```
5. The frontend will instantly update with AI-generated summaries, key points, and action items!

## 🛡️ License

MIT License
