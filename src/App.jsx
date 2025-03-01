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
    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#4b5563', borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1rem' }}>Performance Breakdown:</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: '1rem', rowGap: '0.5rem' }}>
        <div style={{ fontWeight: 500 }}>Total processing time:</div>
        <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 500 }}>{metrics.total_ms || "-"}ms</div>
        
        {metrics.model_inference_ms && (
          <>
            <div>Model inference:</div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>{metrics.model_inference_ms}ms</div>
            <div style={{ paddingLeft: '1rem', fontSize: '0.8rem', color: '#6b7280' }}>- Feature extraction:</div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem', color: '#6b7280' }}>
              {Math.round(metrics.model_inference_ms * 0.15)}ms (est.)
            </div>
            <div style={{ paddingLeft: '1rem', fontSize: '0.8rem', color: '#6b7280' }}>- ONNX computation:</div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem', color: '#6b7280' }}>
              {Math.round(metrics.model_inference_ms * 0.75)}ms (est.)
            </div>
            <div style={{ paddingLeft: '1rem', fontSize: '0.8rem', color: '#6b7280' }}>- Post-processing:</div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem', color: '#6b7280' }}>
              {Math.round(metrics.model_inference_ms * 0.1)}ms (est.)
            </div>
          </>
        )}
        
        {metrics.overhead_ms && (
          <>
            <div>Audio processing overhead:</div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>{metrics.overhead_ms}ms</div>
          </>
        )}
        
        {/* Add estimated words per second metric */}
        <div style={{ marginTop: '0.5rem', fontWeight: 500 }}>Processing speed:</div>
        <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, marginTop: '0.5rem' }}>
          {metrics.total_ms ? `${(1000 / metrics.total_ms).toFixed(2)}x realtime` : "-"}
        </div>
      </div>
    </div>
  );
}

// Word timestamp component
function WordTimestamps({ chunks }) {
  if (!chunks || chunks.length === 0) return null;
  
  return (
    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem', display: 'none' }}>
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

// Audio recording logic with streaming support
function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const streamingIntervalRef = useRef(null);
  const processingChunkRef = useRef(false);
  
  const addLog = (message) => {
    // Only add important logs
    if (message.includes('Recording') || message.includes('Transcription') || message.includes('Error')) {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      setLogs(prevLogs => [...prevLogs, { 
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9), 
        message, 
        timestamp
      }]);
    }
  };

  const startRecording = async (onAudioChunk) => {
    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000, // Use 16kHz directly if possible
      });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000, // Request 16kHz if possible
          channelCount: 1,   // Mono
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      // Create media recorder with smaller timeslice for more frequent chunks
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      // Set up data handler for streaming
      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Process this chunk if we're not already processing one
          if (onAudioChunk && !processingChunkRef.current) {
            processingChunkRef.current = true;
            
            try {
              // Create a blob from all chunks so far
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              
              // Process the audio chunk
              await onAudioChunk(audioBlob);
            } catch (error) {
              console.error('Error processing audio chunk:', error);
            } finally {
              processingChunkRef.current = false;
            }
          }
        }
      };
      
      // Start recording with a 1-second timeslice for streaming
      mediaRecorderRef.current.start(1000);
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

      // Clear any streaming interval
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
        streamingIntervalRef.current = null;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const tracks = mediaRecorderRef.current.stream.getTracks();
        tracks.forEach(track => track.stop());
        
        // Close audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        
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
  const [streamingTranscription, setStreamingTranscription] = useState('');
  const [wordTimestamps, setWordTimestamps] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isRecording, startRecording, stopRecording, logs, addLog } = useAudioRecorder();
  const [logPanelWidth, setLogPanelWidth] = useState(300);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const transcriber = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const streamingMetricsRef = useRef({
    chunks_processed: 0,
    total_audio_duration: 0,
    total_processing_time: 0,
  });
  
  // Function to handle loading the model from local files
  const loadModel = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Import transformers package with additional components
      const { pipeline, env, AutoProcessor } = await import('@xenova/transformers');
      
      // Configure for local files only
      env.allowLocalModels = true;
      env.localModelPath = '/models/';
      
      // Disable any online retrieval
      env.useCacheFirst = false;
      env.remoteModelPath = null;
      
      // Performance optimizations
      env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency || 4; // Use available CPU cores
      env.backends.onnx.wasm.simd = true; // Enable SIMD if available
      env.backends.onnx.wasm.proxy = false; // Disable proxy for better performance
      
      // Use the correct model name format
      const modelName = 'Xenova/whisper-tiny';
      
      // Configure options with performance optimizations
      const options = {
        quantized: true,
        local_files_only: true,
        revision: 'main',
        cache_dir: '/models/',
        framework: 'onnx',
        optimize: true, // Request runtime optimizations
      };
      
      // Pre-load the processor to avoid doing this during inference
      const processor = await AutoProcessor.from_pretrained(modelName, options);
      
      // Create the pipeline with the processor
      transcriber.current = await pipeline('automatic-speech-recognition', modelName, {
        ...options,
        processor: processor, // Use the pre-loaded processor
        chunk_length_s: 5,    // Use smaller chunks for streaming
        stride_length_s: 1,   // Smaller stride for better continuity
      });
      
      setModelLoaded(true);
      addLog('Model loaded successfully');
    } catch (error) {
      console.error('Error loading model:', error);
      addLog(`Error loading model: ${error.message}`);
      setError(`Failed to load model: ${error.message}. Make sure all model files are correctly placed in the public/models/Xenova/whisper-tiny directory.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Process a chunk of audio for streaming transcription
  const processAudioChunk = async (audioBlob) => {
    if (!transcriber.current) return;
    
    try {
      const chunkStartTime = performance.now();
      
      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Create a Float32Array from the audio data
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioData = await new Promise((resolve) => {
        audioContext.decodeAudioData(arrayBuffer, (buffer) => {
          // Get the first channel data
          const channelData = buffer.getChannelData(0);
          
          // Resample to 16kHz if needed
          if (buffer.sampleRate !== 16000) {
            const resampleRatio = buffer.sampleRate / 16000;
            const resampledLength = Math.floor(channelData.length / resampleRatio);
            const resampledData = new Float32Array(resampledLength);
            
            for (let i = 0; i < resampledLength; i++) {
              resampledData[i] = channelData[Math.floor(i * resampleRatio)];
            }
            
            resolve(resampledData);
          } else {
            resolve(channelData);
          }
        });
      });
      
      // Close the audio context
      audioContext.close();
      
      // Measure audio duration
      const audioDuration = audioData.length / 16000; // in seconds
      
      // Process with streaming options
      const result = await transcriber.current(audioData, {
        return_timestamps: false, // Simpler for streaming
        is_partial: true, // Mark as partial for streaming
      });
      
      // Update streaming transcription
      setStreamingTranscription(result.text || "");
      
      // Update streaming metrics (but don't display them yet)
      const chunkEndTime = performance.now();
      const chunkProcessingTime = chunkEndTime - chunkStartTime;
      
      streamingMetricsRef.current.chunks_processed += 1;
      streamingMetricsRef.current.total_audio_duration += audioDuration;
      streamingMetricsRef.current.total_processing_time += chunkProcessingTime;
      
      // We're not updating performance metrics during streaming to avoid UI lag
      
    } catch (error) {
      console.error('Error in streaming transcription:', error);
      // Don't show errors during streaming to avoid disrupting the UI
    }
  };
  
  // Use effect to load the model on component mount
  useEffect(() => {
    loadModel();
  }, []);

  const handleMicrophoneClick = async () => {
    if (isRecording) {
      // Stop recording
      setIsProcessing(true);
      // Keep the streaming transcription visible during finalization
      // Don't clear streamingTranscription here
      
      const audioBlob = await stopRecording();
      
      if (audioBlob) {
        try {
          addLog('Finalizing transcription...');
          
          const startTime = performance.now();
          
          // Process the complete audio for final result
          const arrayBuffer = await audioBlob.arrayBuffer();
          
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioData = await new Promise((resolve) => {
            audioContext.decodeAudioData(arrayBuffer, (buffer) => {
              const channelData = buffer.getChannelData(0);
              
              if (buffer.sampleRate !== 16000) {
                const resampleRatio = buffer.sampleRate / 16000;
                const resampledLength = Math.floor(channelData.length / resampleRatio);
                const resampledData = new Float32Array(resampledLength);
                
                for (let i = 0; i < resampledLength; i++) {
                  resampledData[i] = channelData[Math.floor(i * resampleRatio)];
                }
                
                resolve(resampledData);
              } else {
                resolve(channelData);
              }
            });
          });
          
          audioContext.close();
          
          // Measure audio duration
          const audioDuration = audioData.length / 16000;
          
          // Run final inference with word timestamps
          const inferenceStart = performance.now();
          
          const result = await transcriber.current(audioData, { 
            return_timestamps: 'word',
          });
          
          const inferenceEnd = performance.now();
          const inferenceTime = inferenceEnd - inferenceStart;
          
          const endTime = performance.now();
          const totalTime = endTime - startTime;
          
          // Calculate overhead time
          const overheadTime = totalTime - inferenceTime;
          
          // Set final transcription
          setTranscription(result.text || "");
          setStreamingTranscription(""); // Only clear streaming transcription after we have the final result
          
          // Set word timestamps
          setWordTimestamps(result.chunks || null);
          
          // Set final performance metrics
          setPerformanceMetrics({
            streaming: false,
            total_ms: Math.round(totalTime),
            model_inference_ms: Math.round(inferenceTime),
            overhead_ms: Math.round(overheadTime),
            audio_duration_s: audioDuration,
            realtime_factor: totalTime / (audioDuration * 1000),
          });
          
          addLog('Transcription complete');
        } catch (error) {
          console.error('Transcription error:', error);
          addLog(`Error: ${error.message}`);
          setError(`Transcription failed: ${error.message}`);
        }
      }
      setIsProcessing(false);
    } else {
      // Start recording with streaming
      if (!modelLoaded) {
        addLog('Model not loaded yet. Please wait.');
        return;
      }
      
      // Reset state for new recording
      setTranscription('');
      setStreamingTranscription('');
      setWordTimestamps(null);
      setPerformanceMetrics(null); // Clear performance metrics
      setError(null);
      
      // Reset streaming metrics
      streamingMetricsRef.current = {
        chunks_processed: 0,
        total_audio_duration: 0,
        total_processing_time: 0,
      };
      
      // Set recording start time
      recordingStartTimeRef.current = performance.now();
      
      // Start recording with streaming processor
      await startRecording(processAudioChunk);
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
          ONNX Whisper
        </div>
        
        {/* Centered Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingLeft: '2rem', paddingRight: '2rem' }}>
          <div style={{ width: '100%', maxWidth: '28rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: 'white', marginBottom: '1rem', position: 'relative', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
              {/* Transcription area */}
              <div style={{ padding: '1.25rem', minHeight: '180px' }}>
                {error ? (
                  <div>
                    <p style={{ color: '#ef4444', margin: '0 0 1rem 0' }}>{error}</p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Make sure the model files are in the 'whisper-tiny' folder.
                    </p>
                  </div>
                ) : isProcessing ? (
                  <div>
                    <p style={{ margin: 0 }}>{streamingTranscription}</p>
                    <p style={{ color: '#6b7280', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>Finalizing transcription...</p>
                  </div>
                ) : isRecording && streamingTranscription ? (
                  <div style={{ position: 'relative' }}>
                    <p style={{ margin: 0 }}>{streamingTranscription}</p>
                    <div style={{ position: 'absolute', bottom: '-1.5rem', right: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                      Streaming...
                    </div>
                  </div>
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
          <h2 style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {logs.length === 0 ? (
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>No activity yet</div>
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
