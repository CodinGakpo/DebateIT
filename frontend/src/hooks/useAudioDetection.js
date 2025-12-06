import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook to detect when user is speaking using Web Audio API
 * @param {boolean} isMuted - Whether the microphone is muted
 * @param {number} threshold - Audio level threshold to detect speaking (0-255)
 * @returns {boolean} isSpeaking - Whether the user is currently speaking
 */
export function useAudioDetection(isMuted, threshold = 30) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function setupAudioDetection() {
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        // Create audio context and analyser
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;
        
        microphone.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        microphoneRef.current = microphone;

        // Start detecting audio levels
        detectAudioLevel();
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    }

    function detectAudioLevel() {
      if (!mounted || !analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      function checkLevel() {
        if (!mounted || !analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average audio level
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        // Update speaking status based on threshold
        setIsSpeaking(!isMuted && average > threshold);
        
        animationFrameRef.current = requestAnimationFrame(checkLevel);
      }

      checkLevel();
    }

    if (!isMuted) {
      setupAudioDetection();
    } else {
      setIsSpeaking(false);
    }

    return () => {
      mounted = false;
      
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isMuted, threshold]);

  return isSpeaking;
}

export default useAudioDetection;