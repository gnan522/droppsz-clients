# Droppsz Medias — Corporate Clients

A phone app (installable web app) for tracking corporate video clients: package price, add-ons, videos delivered/left, and payments. Data is stored in Firebase Firestore and synced live between you and your partner. Hosted free on GitHub Pages.

## Signing in
There are no accounts. Open the app and type the team **code word**. The app signs in anonymously, and the Firestore rules only open `teams/<code word>/clients` when the word matches (the live rules store a SHA-256 hash, not the word). The word is remembered on each device until you tap **Lock**.

To change the code word, update the hash in the Firebase console rules. Note that data is stored under the word, so existing clients need moving to the new word (ask Claude).

## Put it on your phone
- **iPhone (Safari):** open https://gnan522.github.io/droppsz-clients/ → Share → **Add to Home Screen**.
- **Android (Chrome):** open the link → ⋮ menu → **Install app** / **Add to Home screen**.

On first sign-in, tap **Load my 4 starting clients** (Kajen, Rueshan, Wealth Experience, Tisant) or add clients with **+ Add client**.

## Setup (already done)
- Firebase project `droppsz-clients`: Firestore (Toronto), Anonymous auth, rules as in `firestore.rules` (with the real hash), authorized domain `gnan522.github.io`.
- GitHub Pages: deploys from `main` / root.

## Files
- `index.html`, `app.js` — the app
- `firebase-config.js` — your Firebase project's web config (safe to be public; access is enforced by sign-in + rules)
- `firestore.rules` — who can read/write (only the right code word)
- `manifest.webmanifest`, `sw.js`, `icons/` — make it installable and work offline
