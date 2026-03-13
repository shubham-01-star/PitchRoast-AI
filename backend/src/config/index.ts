import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // AWS Bedrock Configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bedrockModelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-sonic-v1:0',
    bedrockLiteModelId: process.env.BEDROCK_LITE_MODEL_ID || 'amazon.nova-lite-v1:0',
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    name: process.env.DB_DATABASE || 'start',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    url: process.env.DATABASE_URL || '',
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3001'),
    wsPort: parseInt(process.env.WS_PORT || '3001'),
  },

  // Session Configuration
  session: {
    timeoutMs: parseInt(process.env.SESSION_TIMEOUT_MS || '120000'),
    maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '3'),
    reconnectDelayMs: parseInt(process.env.RECONNECT_DELAY_MS || '2000'),
  },

  // Cost Control
  costControl: {
    dailyTokenLimit: parseInt(process.env.DAILY_TOKEN_LIMIT || '1000000'),
  },
};
