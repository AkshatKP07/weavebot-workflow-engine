import 'dotenv/config';

export const ENV = {
  PORT: process.env.PORT || 3001,
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  REDIS_URI: process.env.REDIS_URI,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
};

// Security Failsafe: Prevent boot if critical keys are missing
const requiredKeys = ['REDIS_URI', 'ENCRYPTION_KEY'];
for (const key of requiredKeys) {
  if (!ENV[key]) {
    console.error(`🚨 FATAL ERROR: Missing ${key} in .env file!`);
    process.exit(1); 
  }
}