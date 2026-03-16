#!/bin/bash
set -e

echo "=== PitchRoast AI - VPS Deploy ==="

# 1. Pull latest code
git pull origin main

# 2. Install & build backend
echo "--- Building backend ---"
cd backend
npm install
npm run build
cd ..

# 3. Install & build frontend
echo "--- Building frontend ---"
npm install
npm run build

# 4. Restart with PM2
echo "--- Restarting PM2 ---"
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js

pm2 save
echo "=== Deploy complete ==="
echo "Backend: http://$(hostname -I | awk '{print $1}'):4000"
echo "Frontend: http://$(hostname -I | awk '{print $1}'):4001"
