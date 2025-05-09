const authDebug = {
    log: (location, ...args) => {
      console.log(`[AUTH DEBUG] ${location}:`, ...args);
    },
    
    error: (location, error) => {
      console.error(`[AUTH DEBUG ERROR] ${location}:`, error);
      
      // Extract and log the most useful information
      const errorDetails = {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      };
      
      console.error('[AUTH ERROR DETAILS]:', errorDetails);
      
      return errorDetails;
    },
    
    comparePasswords: async (entered, stored, bcrypt) => {
      try {
        const result = await bcrypt.compare(entered, stored);
        console.log(`[PASSWORD COMPARISON] Result: ${result}`);
        return result;
      } catch (error) {
        console.error('[PASSWORD COMPARISON ERROR]:', error);
        return false;
      }
    }
  };
  
  module.exports = authDebug;