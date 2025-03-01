import { useState, useRef, useEffect } from 'react';
// Import pipeline dynamically to avoid SSR issues
// import { pipeline } from '@xenova/transformers';

// Microphone button component with square icon when recording
function MicrophoneButton({ isRecording, onClick, disabled }) {
  return (
    <button
      style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '2.5rem',
        height: '2.5rem',
        borderRadius: '0.375rem',
        transition: 'all 300ms',
        backgroundColor: isRecording ? '#ef4444' : '#000000',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none'
      }}
      onClick={onClick}
      disabled={disabled}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {isRecording ? (
        // Stop square icon when recording
        <div style={{ 
          width: '0.75rem', 
          height: '0.75rem', 
          backgroundColor: 'white', 
          borderRadius: '1px' 
        }}></div>
      ) : (
        // Microphone icon when not recording
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="white" 
          style={{ width: '1.1rem', height: '1.1rem' }}
        >
          <path fillRule="evenodd" d="M13 6a1 1 0 1 0-2 0v4a1 1 0 1 0 2 0V6zm-1 8a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0v-3a1 1 0 0 1 1-1z" clipRule="evenodd"/>
          <path fillRule="evenodd" d="M12 2a4 4 0 0 0-4 4v4a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4zm-2 4a2 2 0 1 1 4 0v4a2 2 0 1 1-4 0V6z" clipRule="evenodd"/>
          <path d="M7 12a1 1 0 0 1 1 1 4 4 0 0 0 8 0 1 1 0 1 1 2 0 6 6 0 0 1-5 5.92V21a1 1 0 1 1-2 0v-2.08A6 6 0 0 1 6 13a1 1 0 0 1 1-1z"/>
        </svg>
      )}
    </button>
  );
}

// Performance metrics display component
function PerformanceMetrics({ metrics }) {
  if (!metrics) return null;
  
  return (
    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem' }}>
      <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Performance Metrics:</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: '1rem', rowGap: '0.25rem' }}>
        <div>Total time:</div>
        <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>{metrics.total_ms || "-"}ms</div>
        
        {metrics.preprocessing_ms && (
          <>
            <div>Pre-processing:</div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>{metrics.preprocessing_ms}ms</div>
          </>
        )}
        
        {metrics.model_inference_ms && (
          <>
            <div>Model inference:</div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>{metrics.model_inference_ms}ms</div>
          </>
        )}
        
        {metrics.overhead_ms && (
          <>
            <div>Overhead:</div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>{metrics.overhead_ms}ms</div>
          </>
        )}
      </div>
    </div>
  );
}

// Word timestamp component
function WordTimestamps({ chunks }) {
  if (!chunks || chunks.length === 0) return null;
  
  return (
    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem' }}>
      <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Word Timestamps:</div>
      <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '0.5rem' }}>
        {chunks.map((chunk, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span>{chunk.text}</span>
            <span style={{ fontFamily: 'monospace', color: '#4b5563' }}>
              [{chunk.timestamp[0].toFixed(2)}s - {chunk.timestamp[1].toFixed(2)}s]
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Audio recording logic
function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setLogs(prevLogs => [...prevLogs, { 
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9), 
      message, 
      timestamp
    }]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      addLog('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      addLog(`Error: ${error.message}`);
    }
  };

  const stopRecording = () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const tracks = mediaRecorderRef.current.stream.getTracks();
        tracks.forEach(track => track.stop());
        
        setIsRecording(false);
        addLog('Recording stopped');
        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
    });
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
    logs,
    addLog
  };
}

// Status indicator component
function StatusIndicator({ status, text }) {
  if (status === 'initializing') {
    return (
      <span style={{ display: 'flex', alignItems: 'center' }}>
        <svg className="animate-spin" style={{ marginRight: '0.5rem', height: '1rem', width: '1rem', color: 'black' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {text}
      </span>
    );
  }
  
  let color = '#eab308'; // Yellow for not initialized
  if (status === 'ready') color = '#10b981'; // Green
  if (status === 'recording') color = '#ef4444'; // Red
  if (status === 'error') color = '#f43f5e'; // Error red
  
  const animationClass = status === 'recording' ? 'animate-pulse' : '';
  
  return (
    <span style={{ display: 'flex', alignItems: 'center' }}>
      <span className={animationClass} style={{ 
        height: '0.5rem', 
        width: '0.5rem', 
        backgroundColor: color, 
        borderRadius: '9999px', 
        marginRight: '0.5rem' 
      }}></span>
      {text}
    </span>
  );
}

function App() {
  const [transcription, setTranscription] = useState('');
  const [wordTimestamps, setWordTimestamps] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const { isRecording, startRecording, stopRecording, logs, addLog } = useAudioRecorder();
  const [logPanelWidth, setLogPanelWidth] = useState(300);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const transcriber = useRef(null);
  
  // Function to handle loading the model from local files
  const loadModel = async () => {
    try {
      setIsLoading(true);
      setError(null);
      addLog('Loading transformers.js package...');
      
      // Import transformers package
      const { pipeline, env } = await import('@xenova/transformers');
      
      // Configure for local files only
      addLog('Configuring for local model loading');
      
      // Set to only use local files
      env.allowLocalModels = true;
      env.localModelPath = '/models/';
      
      // Disable any online retrieval
      env.useCacheFirst = false; // Don't try online if local fails
      env.remoteModelPath = null; // Don't use remote path
      
      // Use the correct model name format
      const modelName = 'Xenova/whisper-tiny';
      addLog(`Setting up to load local model from: ${env.localModelPath}${modelName}`);
      
      // Configure options with progress reporting
      const options = {
        quantized: true,
        progress_callback: (progress) => {
          if (progress.status) {
            addLog(`Model loading: ${progress.status}`);
          }
        },
        local_files_only: true // Enforce local files only
      };
      
      addLog('Creating ASR pipeline...');
      transcriber.current = await pipeline('automatic-speech-recognition', modelName, options);
      
      setModelLoaded(true);
      addLog('Whisper model loaded successfully!');
    } catch (error) {
      console.error('Error loading model:', error);
      
      // Simplified error handling focused on local file access
      addLog(`Error loading model: ${error.message}`);
      setError(`Failed to load model: ${error.message}. Make sure all model files are correctly placed in the public/models/Xenova/whisper-tiny directory.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Use effect to load the model on component mount
  useEffect(() => {
    loadModel();
  }, []);

  const handleMicrophoneClick = async () => {
    if (isRecording) {
      setIsProcessing(true);
      const audioBlob = await stopRecording();
      
      if (audioBlob) {
        try {
          addLog('Processing audio with Whisper model...');
          
          const startTime = performance.now();
          
          // Create a URL for the blob to be processed
          const audioURL = URL.createObjectURL(audioBlob);
          
          // Run inference with the ONNX model - directly pass the URL to the transcriber
          const inferenceStart = performance.now();
          
          // Use word-level timestamps if enabled
          const options = showTimestamps ? { return_timestamps: 'word' } : {};
          addLog('Running inference...');
          const result = await transcriber.current(audioURL, options);
          
          // Clean up the URL
          URL.revokeObjectURL(audioURL);
          
          const inferenceEnd = performance.now();
          const inferenceTime = inferenceEnd - inferenceStart;
          
          const endTime = performance.now();
          const totalTime = endTime - startTime;
          
          // Calculate overhead time
          const overheadTime = totalTime - inferenceTime;
          
          // Set transcription text
          setTranscription(result.text || "");
          
          // Set word timestamps if available
          if (showTimestamps && result.chunks) {
            setWordTimestamps(result.chunks);
          } else {
            setWordTimestamps(null);
          }
          
          // Set performance metrics
          setPerformanceMetrics({
            total_ms: Math.round(totalTime),
            model_inference_ms: Math.round(inferenceTime),
            overhead_ms: Math.round(overheadTime)
          });
          
          addLog('Transcription complete');
        } catch (error) {
          console.error('Transcription error:', error);
          addLog(`Transcription error: ${error.message}`);
          setError(`Transcription failed: ${error.message}`);
        }
      }
      setIsProcessing(false);
    } else {
      if (!modelLoaded) {
        addLog('Model not loaded yet. Please wait.');
        return;
      }
      setTranscription('');
      setWordTimestamps(null);
      setPerformanceMetrics(null);
      setError(null);
      await startRecording();
    }
  };
  
  const handleDragStart = (e) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = logPanelWidth;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    
    // Prevent text selection during drag
    e.preventDefault();
  };
  
  useEffect(() => {
    const handleDragMove = (e) => {
      if (!isDraggingRef.current) return;
      
      const deltaX = startXRef.current - e.clientX;
      const newWidth = Math.max(180, Math.min(500, startWidthRef.current + deltaX));
      setLogPanelWidth(newWidth);
    };
    
    const handleDragEnd = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
        {/* App Title in top left */}
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Whisper Transcription
        </div>
        
        {/* Options in top right */}
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
            <input 
              type="checkbox" 
              checked={showTimestamps} 
              onChange={() => setShowTimestamps(!showTimestamps)}
              style={{ marginRight: '0.5rem' }}
              disabled={isRecording || isProcessing}
            />
            Enable word timestamps
          </label>
        </div>
        
        {/* Centered Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingLeft: '2rem', paddingRight: '2rem' }}>
          <div style={{ width: '100%', maxWidth: '28rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: 'white', marginBottom: '1rem', position: 'relative', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
              {/* Transcription area */}
              <div style={{ padding: '1.25rem', minHeight: '180px' }}>
                {isProcessing ? (
                  <p style={{ color: '#6b7280', margin: 0 }}>Processing audio...</p>
                ) : error ? (
                  <div>
                    <p style={{ color: '#ef4444', margin: '0 0 1rem 0' }}>{error}</p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Make sure the model files are in the 'whisper-tiny' folder.
                    </p>
                  </div>
                ) : transcription ? (
                  <>
                    <p style={{ margin: 0 }}>{transcription}</p>
                    <PerformanceMetrics metrics={performanceMetrics} />
                    {showTimestamps && <WordTimestamps chunks={wordTimestamps} />}
                  </>
                ) : (
                  <p style={{ color: '#6b7280', margin: 0 }}>Transcription will appear here...</p>
                )}
              </div>
              
              {/* Control bar at the bottom */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', borderBottomLeftRadius: '0.375rem', borderBottomRightRadius: '0.375rem' }}>
                {/* Status indicator on the left */}
                <div style={{ fontSize: '0.875rem', color: '#6b7280', paddingLeft: '0.5rem' }}>
                  {isLoading ? 
                    <StatusIndicator status="initializing" text="Loading model..." /> :
                  isProcessing ? 
                    <StatusIndicator status="initializing" text="Processing..." /> :
                  isRecording ? 
                    <StatusIndicator status="recording" text="Recording..." /> :
                  error ?
                    <StatusIndicator status="error" text="Error" /> :
                  modelLoaded ? 
                    <StatusIndicator status="ready" text="Ready" /> :
                    <StatusIndicator status="not-initialized" text="Model not loaded" />
                  }
                </div>
                
                {/* Empty middle space */}
                <div></div>
                
                {/* Microphone button on the right */}
                <MicrophoneButton 
                  isRecording={isRecording} 
                  onClick={handleMicrophoneClick}
                  disabled={isProcessing || isLoading || (!modelLoaded && !isRecording)}
                />
              </div>
            </div>
            
            {/* Retry button if there was an error */}
            {error && (
              <button
                onClick={loadModel}
                disabled={isLoading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? 'Loading...' : 'Retry Loading Model'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Resizable Log Panel */}
      <div style={{ position: 'relative', height: '100vh' }}>
        {/* Drag Handle */}
        <div 
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '0.25rem', cursor: 'ew-resize', zIndex: 10 }}
          onMouseDown={handleDragStart}
        ></div>
        
        <div 
          style={{ height: '100%', borderLeft: '1px solid #e5e7eb', padding: '1rem', overflow: 'auto', backgroundColor: '#f9fafb', width: `${logPanelWidth}px` }}
        >
          <h2 style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Logs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {logs.length === 0 ? (
              <div></div>
            ) : (
              logs.map((log) => (
                <div key={log.id} style={{ fontSize: '0.875rem' }}>
                  <span style={{ color: '#6b7280' }}>[{log.timestamp}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
