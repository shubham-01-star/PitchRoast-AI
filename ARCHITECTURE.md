# PitchRoast AI Architecture

## System Diagram

```mermaid
flowchart LR
    U[Founder / Browser User]

    subgraph FE[Next.js Frontend]
        LP[Landing Page<br/>app/page.tsx]
        HK[Client Hooks<br/>useMicrophone / useAudioStream / useVAD / useWebRTC]
        API[Next API Routes<br/>/api/usage/check<br/>/api/sessions]
        DBV[Dashboard<br/>app/dashboard/page.tsx]
    end

    subgraph BE[Node.js Backend]
        EX[Express Server<br/>backend/src/index.ts]
        WS[WebSocket Handler<br/>backend/src/lib/websocket-handler.ts]
        BR[Bedrock Client<br/>backend/src/lib/bedrock-client.ts]
        BZ[Buzzword Detector]
        SQL[Database Client<br/>backend/src/lib/database.ts]
    end

    subgraph AWS[AWS Services]
        SONIC[Amazon Bedrock<br/>Nova 2 Sonic<br/>speech-to-speech]
        LITE[Amazon Bedrock<br/>Nova 2 Lite<br/>roast report generation]
    end

    subgraph DATA[Data Layer]
        MYSQL[(MySQL<br/>call_sessions<br/>daily_usage)]
    end

    U --> LP
    LP --> HK
    HK <-->|WebSocket audio + control| WS
    LP --> API
    API -->|HTTP proxy| EX
    DBV --> API

    EX --> WS
    EX -->|GET /api/sessions| SQL
    EX -->|GET /api/usage/check| SQL

    WS -->|stream user audio| BR
    BR <-->|bidirectional stream| SONIC
    WS --> BZ
    WS -->|save transcript, usage, report, session| SQL
    SQL --> MYSQL

    BR -->|generate final report| LITE
```

## Request Flow

1. User browser frontend se microphone permission leta hai aur audio capture start hota hai.
2. Frontend WebSocket ke through backend ko PCM audio chunks bhejta hai.
3. Backend `WebSocketHandler` live session manage karta hai aur audio Amazon Bedrock Nova 2 Sonic ko stream karta hai.
4. Bedrock se AI voice response aur transcript events wapas aate hain, jo frontend mein playback hote hain.
5. Backend token usage, transcript, roast report, aur session metadata MySQL mein store karta hai.
6. Dashboard aur usage checks frontend ke Next.js API routes ke through backend REST endpoints se data fetch karte hain.

## Main Components

- Frontend: session start/end, mic access, audio playback, VAD, dashboard UI
- Backend: Express REST APIs, WebSocket session orchestration, Bedrock streaming, buzzword interruption logic
- AI layer: Nova 2 Sonic for live call experience, Nova 2 Lite for post-call roast report
- Data layer: MySQL for session history and daily token usage tracking
