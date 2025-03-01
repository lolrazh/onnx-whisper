import { useState, useRef, useEffect } from 'react';
import { BACKENDS } from './config';

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
          style={{ width: '1.25rem', height: '1.25rem' }}
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
        
        {metrics.api_call_ms && (
          <>
            <div>API call:</div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>{metrics.api_call_ms}ms</div>
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

// Audio recording logic
function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setLogs(prevLogs => [...prevLogs, { 
      id: Date.now(), 
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
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendInitialized, setBackendInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const { isRecording, startRecording, stopRecording, logs, addLog } = useAudioRecorder();
  const [logPanelWidth, setLogPanelWidth] = useState(300);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const activeBackend = 'groq';

  const handleMicrophoneClick = async () => {
    if (isRecording) {
      setIsProcessing(true);
      const audioBlob = await stopRecording();
      
      if (audioBlob) {
        try {
          const result = await BACKENDS[activeBackend].transcribe(audioBlob);
          
          // Handle both simple string returns and object returns with performance data
          if (typeof result === 'string') {
            setTranscription(result);
            setPerformanceMetrics(null);
          } else {
            // Extract the transcription text only
            setTranscription(result.text || "");
            setPerformanceMetrics({
              total_ms: result.total_ms,
              preprocessing_ms: result.preprocessing_ms,
              model_inference_ms: result.model_inference_ms,
              overhead_ms: result.overhead_ms
            });
          }
          
          addLog(`Transcription received from ${BACKENDS[activeBackend].name}`);
        } catch (error) {
          console.error('Transcription error:', error);
          addLog(`Transcription error: ${error.message}`);
        }
      }
      setIsProcessing(false);
    } else {
      if (!backendInitialized) {
        addLog(`Please initialize the backend first`);
        return;
      }
      setTranscription('');
      setPerformanceMetrics(null);
      await startRecording();
    }
  };
  
  const initializeBackend = async () => {
    setIsInitializing(true);
    addLog(`Switching to Groq API`);
    addLog(`Initializing Groq API...`);
    
    try {
      const success = await BACKENDS[activeBackend].initialize(addLog);
      setBackendInitialized(success);
      if (!success) {
        addLog(`Failed to initialize Groq API: Failed to fetch`);
        addLog(`Please make sure the backend server is running at http://localhost:8000`);
        addLog(`Failed to initialize Groq API`);
      }
    } catch (error) {
      addLog(`Error initializing backend: ${error.message}`);
      setBackendInitialized(false);
    } finally {
      setIsInitializing(false);
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

  // Auto-initialize on component mount
  useEffect(() => {
    initializeBackend();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
        {/* App Title in top left */}
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
          LocalWhisper
        </div>
        
        {/* Centered Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingLeft: '2rem', paddingRight: '2rem' }}>
          <div style={{ width: '100%', maxWidth: '28rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: 'white', marginBottom: '1rem', position: 'relative', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
              {/* Transcription area */}
              <div style={{ padding: '1.25rem', minHeight: '180px' }}>
                {isProcessing ? (
                  <p style={{ color: '#6b7280', margin: 0 }}>Processing audio...</p>
                ) : transcription ? (
                  <>
                    <p style={{ margin: 0 }}>{transcription}</p>
                    <PerformanceMetrics metrics={performanceMetrics} />
                  </>
                ) : (
                  <p style={{ color: '#6b7280', margin: 0 }}>Transcription will appear here...</p>
                )}
              </div>
              
              {/* Control bar at the bottom */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', borderBottomLeftRadius: '0.375rem', borderBottomRightRadius: '0.375rem' }}>
                {/* Status indicator on the left */}
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {isInitializing ? 
                    <StatusIndicator status="initializing" text="Initializing..." /> :
                  isProcessing ? 
                    <StatusIndicator status="initializing" text="Processing..." /> :
                  isRecording ? 
                    <StatusIndicator status="recording" text="Recording..." /> :
                  backendInitialized ? 
                    <StatusIndicator status="ready" text="Ready" /> :
                    <StatusIndicator status="not-initialized" text="Not initialized" />
                  }
                </div>
                
                {/* Empty middle space */}
                <div></div>
                
                {/* Microphone button on the right */}
                <MicrophoneButton 
                  isRecording={isRecording} 
                  onClick={handleMicrophoneClick}
                  disabled={isProcessing || isInitializing || (!backendInitialized && !isRecording)}
                />
              </div>
            </div>
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
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No logs yet</p>
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
