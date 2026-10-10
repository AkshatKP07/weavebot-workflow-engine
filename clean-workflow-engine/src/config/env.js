// src/config/env.js

export const ENV = {
  // Your backend URL, defaulting to local if the .env file is missing
  API_BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:3001",
  
  // Useful flags for conditional logging later
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD
};