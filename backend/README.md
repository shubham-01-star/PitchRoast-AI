# PitchRoast AI Backend

WebSocket backend for PitchRoast AI - handles real-time audio streaming to Amazon Bedrock Nova 2 Sonic.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your AWS credentials and database configuration
```

3. Initialize the database:
```bash
npm run init-db
```

4. Start the development server:
```bash
npm run dev
```

## Environment Variables

See `.env.example` for required configuration:
- AWS Bedrock credentials and region
- PostgreSQL database connection
- Server port configuration
- Session timeout and cost control settings

## Database Schema

The database schema is defined in `schema.sql` and includes:
- `call_sessions`: Stores call session data, transcripts, and roast reports
- `daily_usage`: Tracks token consumption for cost control

## Development

- `npm run dev`: Start development server with hot reload
- `npm run build`: Compile TypeScript to JavaScript
- `npm start`: Run production server
- `npm run init-db`: Initialize database schema
