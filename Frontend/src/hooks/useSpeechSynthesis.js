import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for Web Speech API SpeechSynthesis
 * Free, built-in browser text-to-speech.
 *
 * @returns {Object} { speak, cancel, speaking, supported }
 */
export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const voicesRef = useRef([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);

      const updateVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;

      return () => {
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  const getEnglishVoice = useCallback(() => {
    const voices = voicesRef.current.length > 0 ? voicesRef.current : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);
    if (!voices.length) return null;

    // Preference: Indian English -> US English -> British English -> any English voice
    return (
      voices.find((v) => v.lang === 'en-IN') ||
      voices.find((v) => v.lang === 'en-US') ||
      voices.find((v) => v.lang === 'en-GB') ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0]
    );
  }, []);

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    (text) => {
      if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      // Cancel previous speech if any
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const preferredVoice = getEnglishVoice();
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setSpeaking(true);
      };

      utterance.onend = () => {
        setSpeaking(false);
      };

      utterance.onerror = (err) => {
        console.warn('[SpeechSynthesis error]:', err);
        setSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [getEnglishVoice]
  );

  return {
    speak,
    cancel,
    speaking,
    supported,
  };
}

export default useSpeechSynthesis;
