# Droppsz Medias — Corporate Clients

A phone app (installable web app) for tracking corporate video clients: package price, add-ons, videos delivered/left, and payments. Data is stored in Firebase Firestore and synced live between you and your partner. Hosted free on GitHub Pages.

## One-time setup

### 1. Firebase (≈5 minutes)
1. Go to https://console.firebase.google.com → **Add project** (name it e.g. `droppsz-clients`; Google Analytics not needed).
2. **Build → Firestore Database → Create database** → choose region `northamerica-northeast2 (Toronto)` → start in **production mode**.
3. **Build → Authentication → Get started → Email/Password → Enable**.
4. **Authentication → Users → Add user**: add yourself and your partner (email + password).
5. **Firestore → Rules**: paste the contents of `firestore.rules`, with your two real emails, then **Publish**.
6. **Project settings (gear) → Your apps → Web (`</>`)** → register app → copy the `firebaseConfig` values into `firebase-config.js`.
7. **Authentication → Settings → Authorized domains → Add domain**: `gnan522.github.io`.

### 2. GitHub Pages
Repo **Settings → Pages → Deploy from a branch → `main` / root**. The app will be live at `https://gnan522.github.io/<repo-name>/`.

### 3. Put it on your phone
- **iPhone (Safari):** open the link → Share → **Add to Home Screen**.
- **Android (Chrome):** open the link → ⋮ menu → **Install app** / **Add to Home screen**.

Sign in, then tap **Load my 4 starting clients** (Kajen, Rueshan, Wealth Experience, Tisant) or add clients with **+ Add client**.

## Files
- `index.html`, `app.js` — the app
- `firebase-config.js` — your Firebase project's web config (safe to be public; access is enforced by sign-in + rules)
- `firestore.rules` — who can read/write (only the listed emails)
- `manifest.webmanifest`, `sw.js`, `icons/` — make it installable and work offline

## Adding someone later
Add their account in Firebase **Authentication → Users**, and add their email to the list in **Firestore → Rules**.
