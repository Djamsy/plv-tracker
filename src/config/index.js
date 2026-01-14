export const config = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  features: {
    testButtons: import.meta.env.DEV,
    debugMode: import.meta.env.DEV,
  }
}