# MeetIQ AWS EC2 Deployment Guide

Complete step-by-step guide to deploying **MeetIQ** (React SPA + Node.js Express API) on an **AWS EC2 Ubuntu Instance** with **PM2** process management and **Nginx** reverse proxy.

---

## 🏗️ Architecture Overview

On EC2, our Node.js Express server serves both:
1. **REST API Endpoints** (`/api/...`)
2. **React SPA Production Build** (`client/dist` static assets)

Nginx routes traffic on port 80/443 to the Node.js app running on port 5000 via PM2.

---

## Step 1: Launch your EC2 Instance

1. Open **AWS Console** → **EC2** → **Launch Instance**.
2. **Name**: `MeetIQ-Production-Server`
3. **AMI**: Ubuntu 24.04 LTS (or Ubuntu 22.04 LTS).
4. **Instance Type**: `t3.small` (recommended) or `t3.micro` (free tier eligible).
5. **Key Pair**: Select or create a `.pem` SSH key pair (download it to your machine).
6. **Network Settings (Security Group)**:
   - Allow **SSH** (Port 22) from Anywhere (or your IP).
   - Allow **HTTP** (Port 80) from Anywhere.
   - Allow **HTTPS** (Port 443) from Anywhere.
7. Click **Launch Instance**.

---

## Step 2: Connect to your EC2 Instance

Open PowerShell or Terminal on your local machine:

```bash
# Set key permissions (on Mac/Linux)
chmod 400 your-key.pem

# SSH into EC2 (replace <EC2_PUBLIC_IP> with your instance's Public IPv4)
ssh -i "your-key.pem" ubuntu@<EC2_PUBLIC_IP>
```

---

## Step 3: Install Node.js, Git & PM2 on EC2

Run these commands inside your EC2 terminal:

```bash
# Update Ubuntu packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# Verify installations
node -v
npm -v

# Install PM2 globally (Process Manager for Node.js)
sudo npm install -g pm2
```

---

## Step 4: Clone Codebase & Build Frontend

```bash
# Clone your GitHub repository
git clone https://github.com/YOUR_USERNAME/MeetIQ.git
cd MeetIQ

# 1. Install & Build Client
cd client
npm install
npm run build
cd ..

# 2. Install Server Dependencies
cd server
npm install
```

---

## Step 5: Configure `.env` on EC2

Create the production `.env` file inside `MeetIQ/server`:

```bash
nano .env
```

Paste your environment variables:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_production_jwt_secret

AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_iam_access_key
AWS_SECRET_ACCESS_KEY=your_iam_secret_key
AWS_S3_BUCKET_NAME=meetiq-uploads
```

Save and exit: Press `Ctrl + O`, `Enter`, then `Ctrl + X`.

---

## Step 6: Start Server with PM2

```bash
# Start server using PM2
pm2 start index.js --name meetiq

# Save PM2 process list & configure autostart on system reboot
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

Useful PM2 commands:
- `pm2 status` — View server status
- `pm2 logs meetiq` — View live application logs
- `pm2 restart meetiq` — Restart application

---

## Step 7: Configure Nginx Reverse Proxy

Create Nginx site configuration:

```bash
sudo nano /etc/nginx/sites-available/meetiq
```

Paste this configuration (replace `<EC2_PUBLIC_IP>` with your instance IP or domain name):

```nginx
server {
    listen 80;
    server_name <EC2_PUBLIC_IP>;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable the configuration and restart Nginx:

```bash
# Enable site config
sudo ln -s /etc/nginx/sites-available/meetiq /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx syntax & restart
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 8: Update AWS Lambda Webhook URL

Now that your backend is running live on EC2:
1. Open **AWS Lambda Console** → function **`meetiq-processor`**.
2. Go to **Configuration** → **Environment variables** → Edit.
3. Update `WEBHOOK_URL`:
   ```
   http://<EC2_PUBLIC_IP>/api/meetings/webhook
   ```
4. Click **Save**.

---

## 🎉 Success!

Open your browser and navigate to:
`http://<EC2_PUBLIC_IP>`

Your full MeetIQ application is now live on AWS EC2! 🚀
