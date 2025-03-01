// Configuration for the LocalWhisper application

// Define backend interfaces
export const BACKENDS = {
  'groq': {
    name: 'Groq API',
    initialize: async (addLog) => {
      addLog('Initializing Groq API...');
      try {
        addLog('Initializing Groq API backend...');
        // This is a placeholder - we'll implement the actual backend logic later
        // Here we're simulating a failed connection to match the screenshot
        return false;
      } catch (error) {
        addLog(`Failed to initialize Groq API: ${error.message}`);
        return false;
      }
    },
    transcribe: async (audioBlob) => {
      // This is a placeholder for transcription functionality
      return {
        text: "This is a placeholder transcription.",
        total_ms: 1200,
        preprocessing_ms: 200,
        model_inference_ms: 800,
        overhead_ms: 200
      };
    }
  }
} 