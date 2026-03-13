# PitchRoast AI - Project Setup Guide

## Overview

PitchRoast AI is a browser-based AI agent that simulates brutal VC investor calls to help early-stage founders practice their elevator pitches.

## Architecture

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, and App Router
- **Backend**: Node.js with Express and WebSocket server
- **AI**: Amazon Bedrock Nova 2 Sonic (speech-to-speech) and Nova 2 Lite (roast reports)
- **Database**: MySQL for session storage

## Project Structure

```
pitch-roast-ai/
├── app/                    # Next.js app router pages
├── lib/                    # Frontend utilities and types
├── backend/                # Node.js WebSocket backend
│   ├── src/
│   │   ├── lib/           # Database client and utilities
│   │   ├── scripts/       # Database initialization scripts
│   │   ├── types/         # TypeScript type definitions
│   │   └── index.ts       # Server entry point
│   ├── schema.sql         # Database schema
│   └── package.json
└── package.json
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- MySQL 8+
- AWS account with Bedrock access

### 1. Frontend Setup

```bash
cd pitch-roast-ai
npm install
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your AWS credentials and database configuration
```

### 3. Database Setup

Your MySQL database is already configured with these credentials:
- Host: 127.0.0.1
- Port: 3306
- Username: root
- Password: Root@123
- Database: start

Initialize the schema:
```bash
cd backend
npm run init-db
```

### 4. AWS Bedrock Configuration

1. Enable Amazon Bedrock in your AWS account
2. Request access to Nova 2 Sonic and Nova 2 Lite models
3. Create IAM credentials with Bedrock permissions
4. Add credentials to `backend/.env`

### 5. Run the Application

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd pitch-roast-ai
npm run dev
```

Access the application at http://localhost:3000

## Environment Variables

### Frontend (.env.local)
- `NEXT_PUBLIC_WS_URL`: WebSocket backend URL
- `DATABASE_URL`: PostgreSQL connection string (for API routes)
- `NEXT_PUBLIC_SESSION_TIMEOUT_MS`: Session timeout in milliseconds

### Backend (.env)
- `AWS_REGION`: AWS region for Bedrock
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `BEDROCK_MODEL_ID`: Nova 2 Sonic model ID
- `BEDROCK_LITE_MODEL_ID`: Nova 2 Lite model ID
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Backend server port
- `SESSION_TIMEOUT_MS`: Session timeout (120000 = 2 minutes)
- `DAILY_TOKEN_LIMIT`: Daily token usage limit

## Development

- Frontend runs on port 3000
- Backend runs on port 3001
- WebSocket connections use the same port as the backend

## Testing

Manual testing is recommended for hackathon development. Test the complete flow:
1. Click "Start Pitch" button
2. Grant microphone permission
3. Speak your pitch
4. Verify VC agent responds
5. Check roast report generation after 2 minutes

## Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy

### Backend (Render/Railway)
1. Push backend code to GitHub
2. Create new service on Render or Railway
3. Configure environment variables
4. Deploy

### Database
Use managed MySQL from:
- PlanetScale
- Railway MySQL
- Render MySQL
- AWS RDS MySQL

## Cost Control

- Hard 2-minute session limit enforced
- Daily token usage tracking
- Maintenance mode when threshold exceeded

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check connection string in .env
- Ensure database exists and schema is initialized

### WebSocket Connection Issues
- Verify backend is running on correct port
- Check CORS configuration
- Ensure firewall allows WebSocket connections

### AWS Bedrock Issues
- Verify credentials are correct
- Check model access in AWS console
- Ensure region supports Nova 2 models

## License

MIT
