import dotenv from 'dotenv';

dotenv.config();

const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    console.error('   Copy .env.example to .env and fill in all required values.');
    process.exit(1);
  }
}

const config = {
  port: parseInt(process.env.PORT, 10) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 10000 : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100),
  },
  authRateLimit: {
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 10000 : (parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10) || 10),
  },
};

export default config;
