import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for Web Speech API SpeechRecognition
 * Free, built-in browser speech-to-text.
 *
 * @returns {Object} { transcript, listening, start, stop, reset, supported }
 */
export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSupported(true);
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setListening(true);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let currentFinal = finalTranscriptRef.current;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            currentFinal += (currentFinal ? ' ' : '') + item[0].transcript.trim();
            finalTranscriptRef.current = currentFinal;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const fullText = (currentFinal + (interimTranscript ? (currentFinal ? ' ' : '') + interimTranscript : '')).trim();
        setTranscript(fullText);
      };

      recognition.onerror = (event) => {
        console.warn('[SpeechRecognition Error]', event.error);
        if (event.error === 'not-allowed') {
          isListeningRef.current = false;
          setListening(false);
        } else if (event.error === 'no-speech') {
          // Keep listening or allow user to continue speaking
        }
      };

      recognition.onend = () => {
        // If user intended to stay listening in continuous mode, restart unless stopped explicitly
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            isListeningRef.current = false;
            setListening(false);
          }
        } else {
          setListening(false);
        }
      };

      recognitionRef.current = recognition;
    } else {
      setSupported(false);
    }

    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return;
    try {
      isListeningRef.current = true;
      recognitionRef.current.start();
      setListening(true);
    } catch (err) {
      console.warn('[SpeechRecognition start error]:', err);
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    isListeningRef.current = false;
    try {
      recognitionRef.current.stop();
    } catch {}
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
  }, []);

  return {
    transcript,
    listening,
    start,
    stop,
    reset,
    supported,
  };
}

export default useSpeechRecognition;
