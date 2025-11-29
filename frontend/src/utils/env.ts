/**
 * Utility functions for environment variables
 * Follows DRY principle - single source of truth for env vars
 */

export const getEnvVar = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key];
  
  if (!value) {
    console.warn(`Environment variable ${key} is not set`);
  }
  
  return value || '';
};

export const env = {
  NASA_API_KEY: getEnvVar('VITE_NASA_API_KEY'),
  OPENAI_API_KEY: getEnvVar('VITE_OPENAI_API_KEY'),
  MATERIALS_API_KEY: getEnvVar('VITE_MATERIALS_API_KEY'),
  API_BASE_URL: getEnvVar('VITE_API_BASE_URL'),
  MATERIALS_SERVICE_URL: getEnvVar('VITE_MATERIALS_SERVICE_URL'),
} as const;

