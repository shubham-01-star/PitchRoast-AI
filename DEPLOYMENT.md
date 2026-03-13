# Deployment Guide

## Prerequisites

- GitHub account
- Vercel account (for frontend)
- Render or Railway account (for backend)
- AWS account with Bedrock access
- MySQL database (can use PlanetScale, Railway, or Render)

## Step 1: Prepare Repository

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - PitchRoast AI"

# Create GitHub repository and push
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Step 2: Deploy Frontend to Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: `pitch-roast-ai`
   - Build Command: `npm run build`
   - Output Directory: `.next`

5. Add Environment Variables:
   ```
   NEXT_PUBLIC_WS_URL=wss://your-backend-url.com
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
   NEXT_PUBLIC_SESSION_TIMEOUT_MS=120000
   ```

6. Click "Deploy"

## Step 3: Deploy Backend to Render/Railway

### Option A: Render

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - Name: pitchroast-backend
   - Root Directory: `pitch-roast-ai/backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

5. Add Environment Variables (from backend/.env.example)

6. Click "Create Web Service"

### Option B: Railway

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Configure:
   - Root Directory: `pitch-roast-ai/backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

5. Add Environment Variables

6. Click "Deploy"

## Step 4: Set Up MySQL Database

### Option A: PlanetScale (Recommended)

1. Go to https://planetscale.com
2. Create new database
3. Get connection string
4. Add to backend environment variables

### Option B: Railway MySQL

1. In Railway project, click "New"
2. Select "Database" → "MySQL"
3. Copy connection details
4. Add to backend environment variables

### Option C: Render MySQL

1. In Render dashboard, click "New +" → "MySQL"
2. Create database
3. Copy connection string
4. Add to backend environment variables

## Step 5: Initialize Database Schema

After deploying backend:

```bash
# SSH into your backend service or run locally with production DB
npm run init-db
```

Or manually run the schema.sql file in your MySQL database.

## Step 6: Configure AWS Bedrock

1. Go to AWS Console → Bedrock
2. Enable model access for:
   - Amazon Nova 2 Sonic
   - Amazon Nova 2 Lite
3. Create IAM user with Bedrock permissions
4. Generate access keys
5. Add to backend environment variables:
   ```
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=<your-key>
   AWS_SECRET_ACCESS_KEY=<your-secret>
   ```

## Step 7: Update Frontend Environment

Update Vercel environment variables with your deployed backend URL:
```
NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

Redeploy frontend after updating.

## Step 8: Test Deployment

1. Visit your Vercel URL
2. Click "Start Pitch"
3. Grant microphone permission
4. Speak your pitch
5. Verify VC agent responds
6. Check roast report after 2 minutes

## Troubleshooting

### WebSocket Connection Issues
- Ensure backend URL uses `wss://` (not `ws://`) for HTTPS
- Check CORS configuration in backend
- Verify firewall allows WebSocket connections

### Database Connection Issues
- Verify connection string is correct
- Check database is accessible from backend service
- Ensure schema is initialized

### AWS Bedrock Issues
- Verify model access is enabled in AWS Console
- Check IAM permissions for Bedrock
- Ensure region supports Nova 2 models

## Cost Monitoring

- Monitor AWS Bedrock usage in AWS Console
- Check daily_usage table for token consumption
- Adjust DAILY_TOKEN_LIMIT as needed

## Security Checklist

- ✅ API keys stored in environment variables
- ✅ .env files in .gitignore
- ✅ Database credentials secured
- ✅ Session IDs cryptographically secure
- ✅ Audio storage with signed URLs
