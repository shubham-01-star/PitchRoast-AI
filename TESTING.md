# Manual Testing Guide

## Overview

This guide covers manual testing for PitchRoast AI. Automated tests are skipped for hackathon velocity.

## Test Environment Setup

1. **Start Backend**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend**
   ```bash
   npm run dev
   ```

3. **Open Browser**
   Navigate to http://localhost:3000

## Test Cases

### Test 1: Happy Path - Complete Session Flow

**Steps**:
1. Click "Start Pitch" button
2. Grant microphone permission when prompted
3. Wait for "Connected" status
4. Speak your elevator pitch (30-60 seconds)
5. Respond to VC questions
6. Wait for 2-minute timeout or click "End Call"
7. Navigate to dashboard
8. Verify session appears in list
9. Click session to view roast report
10. Verify score, feedback, and transcript are displayed

**Expected Results**:
- ✅ Microphone permission granted
- ✅ WebSocket connection established within 2 seconds
- ✅ Audio streaming works bidirectionally
- ✅ VC agent responds with questions
- ✅ Session ends at 2 minutes
- ✅ Roast report generated within 10 seconds
- ✅ Dashboard displays session with score
- ✅ Transcript shows both user and VC speech

### Test 2: VAD (Voice Activity Detection)

**Steps**:
1. Start a pitch session
2. Speak for 2-3 seconds, then pause for 2 seconds
3. Speak again
4. Vary speaking volume (loud, normal, quiet)
5. Test with background noise

**Expected Results**:
- ✅ Speech detection triggers within 100ms
- ✅ Silence detection after 1.5 seconds
- ✅ Works with different speaking volumes
- ✅ Handles background noise reasonably

**Note**: Frontend AudioContext/AnalyserNode hack provides ~90% accuracy

### Test 3: Buzzword Detection

**Steps**:
1. Start a pitch session
2. Use buzzwords: "disruptive", "revolutionary", "game-changer"
3. Observe VC agent response

**Expected Results**:
- ✅ VC agent interrupts when buzzword detected
- ✅ VC agent asks skeptical follow-up questions
- ✅ Buzzwords appear in roast report with suggestions

### Test 4: Barge-In Detection

**Steps**:
1. Start a pitch session
2. Wait for VC agent to start speaking
3. Interrupt by speaking while VC is talking
4. Observe behavior

**Expected Results**:
- ✅ VC agent stops speaking when interrupted
- ✅ VC agent processes new user input
- ✅ No audio overlap or echo

### Test 5: Long Speech (>30 seconds)

**Steps**:
1. Start a pitch session
2. Speak continuously for more than 30 seconds
3. Observe VC agent behavior

**Expected Results**:
- ✅ VC agent sends Cancel signal after 30 seconds
- ✅ VC agent interrupts with question or comment

### Test 6: Connection Timeout

**Steps**:
1. Click "Start Pitch"
2. Grant microphone permission
3. Disconnect internet or stop backend
4. Observe error handling

**Expected Results**:
- ✅ Connection timeout after 10 seconds
- ✅ User-friendly error message displayed
- ✅ Error logged with context

### Test 7: Microphone Permission Denied

**Steps**:
1. Click "Start Pitch"
2. Deny microphone permission
3. Observe error message

**Expected Results**:
- ✅ Clear error message about microphone requirement
- ✅ Instructions to enable permissions

### Test 8: Session Persistence

**Steps**:
1. Complete a pitch session
2. Close browser
3. Reopen browser and navigate to dashboard
4. Verify session history is preserved

**Expected Results**:
- ✅ Session ID persists in localStorage
- ✅ Dashboard shows previous sessions
- ✅ Session data retrieved from database

### Test 9: Daily Usage Limit

**Steps**:
1. Set DAILY_TOKEN_LIMIT to a low value (e.g., 100)
2. Complete multiple sessions to exceed limit
3. Try to start new session

**Expected Results**:
- ✅ Maintenance message displayed
- ✅ "Start Pitch" button disabled
- ✅ Usage tracked in daily_usage table

### Test 10: Countdown Timer

**Steps**:
1. Start a pitch session
2. Observe countdown timer
3. Wait until < 30 seconds remaining

**Expected Results**:
- ✅ Timer counts down from 2:00
- ✅ Timer updates every second
- ✅ Timer turns red when < 30 seconds
- ✅ Session ends at 0:00

## Demo Video Checklist

Record a demo video showing:

1. ✅ Landing page with "Start Pitch" button
2. ✅ Microphone permission grant
3. ✅ Connection establishment
4. ✅ Speaking a pitch (show audio waveform if possible)
5. ✅ VC agent responding with questions
6. ✅ Countdown timer visible
7. ✅ Session ending at 2 minutes
8. ✅ Roast report generation
9. ✅ Dashboard with session list
10. ✅ Detailed roast report with score
11. ✅ Transcript display
12. ✅ Audio playback

## Performance Benchmarks

Target metrics:
- Connection establishment: < 2 seconds
- End-to-end latency: < 800ms
- Roast report generation: < 10 seconds
- VAD detection: < 100ms

## Known Limitations (Hackathon Scope)

- No user authentication (session-based only)
- Audio storage is placeholder (not S3)
- Limited error recovery
- No retry logic for failed API calls
- Basic VAD (90% accuracy, not production-grade)

## Next Steps After Testing

1. Record demo video
2. Deploy to production (see DEPLOYMENT.md)
3. Test production deployment
4. Submit to hackathon!

---

**Remember**: This is a hackathon project. Focus on the demo video and core functionality. Perfect is the enemy of done! 🚀
