export const environment = {
  production: true,
  // Optional: hardcoded fallback API URL if Firestore is unreachable.
  apiUrlFallback: 'https://meowpow.ngrok.dev',
  // Firebase web config (safe to ship in client). Paste from Firebase Console → Project settings → General.
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
  // Firestore doc path where the backend writes the current ngrok URL.
  apiUrlDoc: 'config/apiUrl',
};
