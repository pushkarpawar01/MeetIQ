# MeetIQ - Vercel Deployment Guide

This project has been configured as a monorepo to deploy both the **Vite React Frontend** and the **Express Node.js Backend** to Vercel in a single project.

## Step 1: Push Changes to GitHub
Make sure all recent changes (including the new `vercel.json` and updated `server/index.js` and `server/config/db.js`) are pushed to your GitHub repository.

```bash
git add .
git commit -m "Configure project for Vercel deployment"
git push origin main
```

## Step 2: Import Project on Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New** > **Project**.
2. Select your `MeetIQ` GitHub repository and click **Import**.

## Step 3: Configure Project Settings
In the **Configure Project** screen, you do **NOT** need to change the Framework Preset or Root Directory. Vercel will read the `vercel.json` file in the root directory to handle the build process automatically.

However, you **MUST** add your Environment Variables before clicking Deploy.

Expand the **Environment Variables** section and add the following keys from your `server/.env` file:
- `MONGO_URI`
- `JWT_SECRET`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_NAME`
- `WEBHOOK_URL` (Wait! You will need to update this **after** deployment - see Step 5)

## Step 4: Click Deploy!
Click **Deploy** and wait for Vercel to build your project. It will build the React frontend and configure the Express backend as serverless functions.

## Step 5: Update Webhook URL (Crucial for AWS)
Once deployed, Vercel will give you a public domain (e.g., `https://meetiq.vercel.app`).
Because your backend URL has changed, you need to update two places:

1. **In Vercel:**
   Go to your Vercel Project Settings > Environment Variables, and update `WEBHOOK_URL` to your new domain:
   `https://<your-vercel-domain>/api/meetings/webhook`
   *(Redeploy your Vercel project after updating this so the backend picks it up)*

2. **In AWS Lambda:**
   Go to your AWS Lambda `meetiq-processor` > Configuration > Environment variables, and update the `WEBHOOK_URL` to exactly the same URL:
   `https://<your-vercel-domain>/api/meetings/webhook`

## Troubleshooting
- **404 Errors on Refresh:** The `vercel.json` is configured to route all unknown paths to `index.html`, which fixes React Router 404s.
- **API Errors:** Ensure your MongoDB Network Access (IP Whitelist) is set to `0.0.0.0/0` (Allow from anywhere), because Vercel Serverless Functions do not have static IP addresses.
