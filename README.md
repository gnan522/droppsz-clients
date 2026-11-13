# Droppsz Medias — Corporate Clients

A phone app (installable web app) for tracking corporate video clients: package price, add-ons, videos delivered/left, and payments. Data is stored in Firebase Firestore and synced live between you and your partner. Hosted free on GitHub Pages.

## Signing in
Everyone uses the team **code word**. Behind the scenes it signs into one shared Firebase account (`team@droppsz-clients.app`), and `firestore.rules` only lets that account read or write client data.

To change the code word: Firebase console → Authentication → Users → `team@droppsz-clients.app` → ⋮ → Reset password.

## Put it on your phone
- **iPhone (Safari):** open https://gnan522.github.io/droppsz-clients/ → Share → **Add to Home Screen**.
- **Android (Chrome):** open the link → ⋮ menu → **Install app** / **Add to Home screen**.

On first sign-in, tap **Load my 4 starting clients** (Kajen, Rueshan, Wealth Experience, Tisant) or add clients with **+ Add client**.

## Setup (already done)
- Firebase project `droppsz-clients`: Firestore (Toronto), Email/Password auth, rules from `firestore.rules`, authorized domain `gnan522.github.io`.
- GitHub Pages: deploys from `main` / root.

## Files
- `index.html`, `app.js` — the app
- `firebase-config.js` — your Firebase project's web config (safe to be public; access is enforced by sign-in + rules)
- `firestore.rules` — who can read/write (only the team account)
- `manifest.webmanifest`, `sw.js`, `icons/` — make it installable and work offline
