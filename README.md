# PitchRoast AI 🔥

A browser-based AI agent that simulates brutal VC investor calls to help early-stage founders practice their elevator pitches. Get real-time feedback, tough questioning, and a detailed "VC Roast Report" to prepare for actual investor conversations.

## Features

- 🎤 **Browser-Based Voice Calls** - No phone setup required, works directly in your browser
- 🤖 **AI VC Agent** - Powered by Amazon Bedrock Nova 2 Sonic for realistic speech-to-speech interaction
- ⏱️ **2-Minute Sessions** - Simulates real VC time constraints
- 🎯 **Tough Questions** - CAC, market timing, competition, revenue model, and more
- 🚫 **Buzzword Detection** - Get interrupted when using "disruptive", "revolutionary", etc.
- 📊 **Roast Reports** - Detailed feedback with scores (0-100) on pitch clarity, confidence, and more
- 📝 **Transcripts** - Full dual-stream transcripts of your calls
- 🔒 **Secure** - Cryptographically secure sessions, encrypted audio storage

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, WebSocket
- **AI**: Amazon Bedrock (Nova 2 Sonic + Nova 2 Lite)
- **Database**: MySQL
- **Audio**: WebRTC, MediaRecorder API, Web Audio API

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL
- AWS account with Bedrock access

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd pitch-roast-ai
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   npm install

   # Backend
   cd backend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Frontend
   cp .env.local.example .env.local
   # Edit .env.local with your backend URL

   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your AWS credentials and database config
   ```

4. **Initialize database**
   ```bash
   cd backend
   npm run init-db
   ```

5. **Run the application**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   npm run dev
   ```

6. **Open your browser**
   Navigate to http://localhost:3000

## Configuration

### AWS Bedrock Setup

1. Enable Amazon Bedrock in your AWS account
2. Request access to:
   - Amazon Nova 2 Sonic (speech-to-speech)
   - Amazon Nova 2 Lite (roast report generation)
3. Create IAM credentials with Bedrock permissions
4. Add credentials to `backend/.env`

### Database Setup

The application uses MySQL. Update `backend/.env` with your database credentials:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=start
```

## Usage

1. **Start a Pitch**
   - Click "Start Pitch" button
   - Grant microphone permission
   - Wait for connection

2. **Practice Your Pitch**
   - Speak naturally about your startup
   - Respond to VC questions
   - Session automatically ends after 2 minutes

3. **Review Your Roast**
   - View your score (0-100)
   - Read detailed feedback
   - Check transcript
   - Listen to recording

## Architecture

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│  Node.js Server │
│   (Backend)     │
└────────┬────────┘
         │
         ├─────────► Amazon Bedrock
         │           (Nova 2 Sonic)
         │
         └─────────► MySQL Database
```

## Key Components

### Frontend
- `app/page.tsx` - Landing page with pitch interface
- `app/dashboard/page.tsx` - Roast reports dashboard
- `lib/hooks/useMicrophone.ts` - Microphone permission handling
- `lib/hooks/useWebRTC.ts` - WebSocket connection manager
- `lib/hooks/useAudioStream.ts` - Audio capture and playback
- `lib/hooks/useVAD.ts` - Voice Activity Detection

### Backend
- `src/index.ts` - Express server with WebSocket
- `src/lib/websocket-handler.ts` - Session management
- `src/lib/bedrock-client.ts` - AWS Bedrock integration
- `src/lib/database.ts` - MySQL client
- `src/lib/buzzword-detector.ts` - Buzzword detection
- `src/lib/logger.ts` - Structured logging

## Cost Control

- Hard 2-minute session limit
- Daily token usage tracking
- Configurable daily limit (default: 1M tokens)
- Maintenance mode when threshold exceeded

## Security

- ✅ Cryptographically secure session IDs
- ✅ 90-day session expiration
- ✅ Environment variable security
- ✅ Audio storage with signed URLs
- ✅ No API keys in code

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.
For a full system diagram, see [ARCHITECTURE.md](./ARCHITECTURE.md).

Quick deploy:
- Frontend: Vercel
- Backend: Render or Railway
- Database: PlanetScale, Railway, or Render MySQL

## Development

### Project Structure

```
pitch-roast-ai/
├── app/                    # Next.js pages
├── lib/                    # Frontend utilities
│   ├── hooks/             # React hooks
│   ├── types.ts           # TypeScript types
│   └── utils/             # Utility functions
├── backend/               # Node.js backend
│   └── src/
│       ├── config/        # Configuration
│       ├── lib/           # Core libraries
│       ├── scripts/       # Database scripts
│       └── types/         # TypeScript types
└── public/                # Static assets
```

### Testing

Manual testing is recommended for hackathon development:

1. Test complete session flow
2. Verify audio streaming
3. Test VAD with various speaking styles
4. Verify roast report generation
5. Test reconnection logic

## Troubleshooting

### Microphone Permission Denied
- Check browser permissions
- Ensure HTTPS (required for getUserMedia)
- Try different browser

### WebSocket Connection Failed
- Verify backend is running
- Check WebSocket URL in .env.local
- Ensure firewall allows WebSocket

### No Audio Response
- Check AWS Bedrock credentials
- Verify model access in AWS Console
- Check browser console for errors

### Database Connection Error
- Verify MySQL is running
- Check database credentials
- Ensure database exists

## Contributing

This is a hackathon project. Feel free to fork and improve!

## License

MIT

## Acknowledgments

- Amazon Bedrock for AI capabilities
- Next.js team for the amazing framework
- The hackathon organizers

---

Built with ❤️ for founders who want to nail their pitch
