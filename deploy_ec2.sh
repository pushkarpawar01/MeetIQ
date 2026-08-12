#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting MeetIQ EC2 Automated Deployment..."

# 1. Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20.x, Git, and Nginx if not already installed
if ! command -v node &> /dev/null; then
    echo "🟢 Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

if ! command -v git &> /dev/null; then
    echo "🟢 Installing Git..."
    sudo apt install -y git
fi

if ! command -v nginx &> /dev/null; then
    echo "🟢 Installing Nginx..."
    sudo apt install -y nginx
fi

# 3. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "🟢 Installing PM2 process manager..."
    sudo npm install -g pm2
fi

# 4. Determine Project Root (Assuming script is run from project root)
PROJECT_DIR="$(pwd)"
echo "📂 Project Directory: $PROJECT_DIR"

# 5. Build Frontend Client
echo "🔨 Building Frontend Client..."
cd "$PROJECT_DIR/client"
npm install
npm run build

# 6. Install Server Dependencies
echo "⚡ Installing Server Dependencies..."
cd "$PROJECT_DIR/server"
npm install

# Check if .env exists
if [ ! -f "$PROJECT_DIR/server/.env" ]; then
    echo "⚠️ Warning: server/.env file not found!"
    echo "Please make sure to create server/.env with your MONGO_URI, JWT_SECRET, and AWS keys."
fi

# 7. Start/Restart Application with PM2
echo "🔄 Managing PM2 Service..."
if pm2 list | grep -q "meetiq"; then
    pm2 restart meetiq
else
    pm2 start index.js --name meetiq
fi
pm2 save

# 8. Configure Nginx Reverse Proxy
echo "🌐 Configuring Nginx Reverse Proxy..."
EC2_IP=$(curl -s http://checkip.amazonaws.com || echo "localhost")

sudo bash -c "cat > /etc/nginx/sites-available/meetiq" <<EOF
server {
    listen 80;
    server_name $EC2_IP;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

# Enable Nginx Site
sudo ln -sf /etc/nginx/sites-available/meetiq /etc/nginx/sites-enabled/meetiq
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx and reload
sudo nginx -t
sudo systemctl restart nginx

echo ""
echo "=================================================="
echo "🎉 MeetIQ Deployment Complete!"
echo "🌐 Public URL: http://$EC2_IP"
echo "=================================================="
