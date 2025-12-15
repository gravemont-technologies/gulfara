# Auth Setup & Security Rules (Botaqi)

## Phase 1: Firebase Console Setup (Execute Manually)

1.  **Create Project:**
    *   Go to [Firebase Console](https://console.firebase.google.com/).
    *   Create project: `botaqiy-arabic-learning`.
    *   Enable Google Analytics.

2.  **Enable Authentication:**
    *   Go to **Build > Authentication > Get Started**.
    *   **Sign-in method:** Enable **Email/Password** and **Google**.
    *   **Authorized domains:** Add `localhost` and your Vercel domain (e.g., `botaqi.vercel.app`).

3.  **Create Firestore Database:**
    *   Go to **Build > Firestore Database > Create Database**.
    *   Location: `eur3` (Europe West) or `us-central1` (US) - choose closest to users.
    *   Start in **Production mode**.

4.  **Get Config:**
    *   Go to **Project Settings > General**.
    *   Register web app "Botaqi Web".
    *   Copy the `firebaseConfig` object.

## Phase 2: Environment Configuration

Create `.env.local` in `botaqi-web/`:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=botaqiy-arabic-learning.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=botaqiy-arabic-learning
VITE_FIREBASE_STORAGE_BUCKET=botaqiy-arabic-learning.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=G-...
```

## Phase 3: Firestore Security Rules

Copy to `firestore.rules`:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // User Profiles: Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    // Decks & Cards: Users manage their own decks
    match /decks/{deckId} {
      allow read, write: if isOwner(resource.data.userId) || isOwner(request.resource.data.userId);
      
      match /cards/{cardId} {
        allow read, write: if isOwner(get(/databases/$(database)/documents/decks/$(deckId)).data.userId);
      }
    }

    // Landing Page Analytics: Anonymous writes allowed
    match /landing_analytics/{eventId} {
      allow create: if true; // Public write for analytics
      allow read: if false;  // Private read (admin only)
    }
    
    // Blocked Actions (Server-side only via Admin SDK)
    match /blocked_actions/{docId} {
      allow read, write: if false;
    }
  }
}
```
