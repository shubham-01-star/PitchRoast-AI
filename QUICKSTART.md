# Quick Start Guide

## ✅ Database Setup Complete

Your MySQL database has been initialized with:
- Database: `start`
- Tables: `call_sessions`, `daily_usage`
- Connection: 127.0.0.1:3306

## Next Steps

### 1. Add AWS Credentials

Edit `backend/.env` and add your AWS Bedrock credentials:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

### 2. Start the Application

Open two terminals:

**Terminal 1 - Backend:**
```bash
cd pitch-roast-ai/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd pitch-roast-ai
npm run dev
```

### 3. Open Your Browser

Navigate to: http://localhost:3000

### 4. Test the Application

1. Click "Start Pitch"
2. Grant microphone permission
3. Wait for "Connected" status
4. Start speaking your pitch
5. Respond to VC questions
6. Session ends after 2 minutes
7. View your roast report!

## Troubleshooting

### Backend won't start
- Check MySQL is running: `mysql -u root -p`
- Verify AWS credentials are set in `backend/.env`

### Frontend won't connect
- Ensure backend is running on port 3001
- Check browser console for errors
- Verify WebSocket URL in `.env.local`

### No audio response
- Check AWS Bedrock model access in AWS Console
- Verify microphone permission granted
- Check browser console for errors

## What's Next?

- ✅ Database initialized
- ⏳ Add AWS credentials
- ⏳ Test locally
- ⏳ Record demo video
- ⏳ Deploy to production

See [TESTING.md](./TESTING.md) for detailed testing guide.
See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.

---

**Need Help?**
- Check [README.md](./README.md) for full documentation
- Review [PROJECT_SETUP.md](./PROJECT_SETUP.md) for setup details
