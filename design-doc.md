WordTrail Technical Design Document (V1)
Project Name: WordTrail

Framework: Nuxt 4 + Capacitor

PWA Module: @vite-pwa/nuxt

Platform: Web (Web Speech API), iOS/Android (Native via Capacitor)

Version: 1.0 (MVP - No Auth)

1. Core Architecture
The app functions as a single-page interface where the "Source Text" is displayed, and a "Live Transcript" (from speech recognition) is mapped to it in real-time.

UI Layer (Nuxt): Handles script rendering and visual highlighting logic.

WordTrail will be a "Reliable Web App." It runs in the browser but, once "Installed" via the PWA prompt, it behaves like a standalone app with its own icon and splash screen.

Persistence: localStorage (for saving user scripts locally without a database).

Offline Support: Service Workers (via Vite PWA) ensure the UI loads without an internet connection.

PWA Configuration
Using @vite-pwa/nuxt allows the app to be "installed" on iOS and Android home screens, which often grants better microphone stability than a standard browser tab.

Key Settings in nuxt.config.ts:

TypeScript

export default defineNuxtConfig({
  modules: ['@vite-pwa/nuxt'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'WordTrail Script Tracker',
      short_name: 'WordTrail',
      description: 'Highlight and track your script reading progress in real-time.',
      theme_color: '#ffffff',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    client: {
      installPrompt: true // Enables custom install button logic
    }
  }
})

2. Technical Component Strategy
A. The "Source Text" Data Structure
Instead of a raw string, we store the script as an array of word objects to enable precise per-word CSS targeting.

TypeScript

interface ScriptWord {
  id: number;
  text: string;
  state: 'pending' | 'active' | 'completed';
}
// Example: [{id: 0, text: "The", state: "completed"}, {id: 1, text: "quick", state: "active"}...]
B. Speech Recognition Setup
The app must listen for Partial Results. This ensures the highlighter moves while the user is still speaking, rather than waiting for them to finish a sentence.

Continuous Mode: true

Interim Results: true

Language: Dynamic based on user selection or device locale.

3. Highlighting Algorithm: "Windowed Fuzzy Matching"
The biggest challenge is that Speech-to-Text (STT) isn't 100% accurate (e.g., user says "The fast fox," but the script says "The quick fox").

The Strategy:
We do not look at the whole script. We use a Sliding Window to search only the next 10-15 words from the last successfully matched word.

Input: Current partial transcript from the STT engine.

Target: A "look-ahead" window of the script.

Process:

Normalize both strings (lowercase, remove punctuation).

Use Levenshtein Distance (fuzzy matching) to find the best match index within the window.

If a match score is above a threshold (e.g., 80%), mark all words up to that index as completed.

The word at that index becomes active (highlighted).

[!TIP] Why fuzzy match? If the user says "gonna" but the script says "going to," a strict match would break the highlighter. Fuzzy matching keeps the "Trail" moving.

4. Implementation: The Speech Composables
Create a composables/useSpeech.ts to keep the logic clean.

TypeScript

```
export const useSpeech = () => {
  const isListening = ref(false)
  const transcript = ref('')

  // Setup the browser API
  const recognition = process.client 
    ? new (window.SpeechRecognition || window.webkitSpeechRecognition)() 
    : null

  if (recognition) {
    recognition.continuous = true
    recognition.interimResults = true
    
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1]
      transcript.value = result[0].transcript
      // Trigger the matching algorithm here
    }
  }

  const toggle = () => {
    isListening.value ? recognition.stop() : recognition.start()
    isListening.value = !isListening.value
  }

  return { transcript, isListening, toggle }
}
```

Step 2: The Highlight Logic
JavaScript

```
const handleSpeechUpdate = (transcript) => {
  const words = transcript.toLowerCase().split(' ');
  const latestSpokenWord = words[words.length - 1];

  // Search window: lastMatchedIndex + 1 to lastMatchedIndex + 10
  const searchWindow = scriptArray.slice(lastMatchedIndex.value + 1, lastMatchedIndex.value + 11);
  
  const match = findBestMatch(latestSpokenWord, searchWindow);
  if (match) {
    lastMatchedIndex.value = match.originalIndex;
  }
};
```

5. UI Requirements
The Script Display: Use v-for to render words. Apply a .highlight class to the active word.

Auto-Scroll: Use watch on lastMatchedIndex to call scrollIntoView() on the active word element.

Visual States:

Use your /frontend-design skill to create the UI that looks modern and user-friendly, simple and intuitive.

Auto-Scroll: The active word should always stay in the center of the viewport. Use element.scrollIntoView({ behavior: 'smooth', block: 'center' }).

6. Known Limitations to Handle
Session Resets: Native mobile STT often times out after ~60 seconds of silence. The engineer must implement an onEnd listener that automatically restarts the session if the user hasn't toggled "Stop."

Background Noise: Implement a "Confidence Threshold"—if the STT confidence is below 0.4, ignore the result to prevent the highlighter from jumping randomly.