# Washington Street Block Party App

A neighborhood community web app for organizing and celebrating the annual block party.  
Built with plain HTML / CSS / ES-module JavaScript — no framework, no build step.  
Backend: **Firebase Authentication** + **Firestore**.

---

## Features

| Tab | What it does |
|-----|-------------|
| 🏠 Home | Pinned event details (date, time, location, theme) + announcement feed with emoji reactions |
| 👥 Directory | Neighbor profiles — everyone can edit their own, admins can edit/remove any |
| 📅 Schedule | Timeline of the day's events — admin manages, everyone reads |
| 🎯 Activities | Sign-up cards for volunteer roles (Grill Master, DJ, etc.) |
| 💬 Chat | Real-time message board; users delete their own, admins can delete any |
| 📸 History | Year-by-year recap cards with photo galleries and highlights |

### Auth & Roles
- Registration is open (anyone with the link can create an account).
- New accounts show a **"Pending Approval"** screen until an admin approves them.
- **Admin** role (`role: "admin"` in Firestore) unlocks a gear icon ⚙️ in the header for user management and all CRUD controls.
- First admin must be set manually (see step 5 below).

---

## Setup

### 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project**.
2. Name it (e.g. `washington-block-party`). Disable Google Analytics if you don't need it.
3. Click **Continue** until the project is created.

### 2. Enable Authentication

1. In the Firebase console, go to **Build → Authentication → Get started**.
2. Click the **Sign-in method** tab and enable **Email/Password**.

### 3. Create a Firestore database

1. Go to **Build → Firestore Database → Create database**.
2. Choose **Production mode** (you'll deploy real security rules shortly).
3. Pick a region close to you (e.g. `us-east1`).

### 4. Wire up the Firebase config

1. In the Firebase console, go to **Project Settings** (gear icon) → **Your apps** → **Add app** → choose the **Web** icon `</>`.
2. Register the app (no need for Firebase Hosting).
3. Copy the `firebaseConfig` object values.
4. Open `js/firebase-config.js` and replace every `"YOUR_*"` placeholder with your real values:

```js
export const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

### 5. Deploy Firestore security rules

Install the Firebase CLI if you haven't:
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project, accept firestore.rules as the rules file
firebase deploy --only firestore:rules
```

### 6. Create the first admin account

1. Open the app in a browser and register normally.
2. In the Firebase console go to **Firestore Database → users → {your-uid}**.
3. Set `approved: true` and `role: "admin"`.
4. Reload the app — you now have full admin access and can approve other users via the ⚙️ panel.

### 7. (Optional) Seed sample data

Use the Firebase console or any Firestore client to add a starting `settings/event` document:
```
Collection: settings
Document:   event
Fields:
  date:        "Saturday, July 12, 2025"
  time:        "11:00 AM – 5:00 PM"
  location:    "Washington Street (between Oak Ave & Elm St)"
  theme:       "Summer Luau 🌺"
  description: "Join your neighbors for food, fun, and community!"
```

---

## Deploy to Netlify

### Option A — Drag and drop (quickest)

1. Go to [app.netlify.com](https://app.netlify.com) and log in.
2. Drag the entire project folder onto the **"Deploy manually"** drop zone.
3. Done — Netlify serves the root `index.html`.

### Option B — Git-connected deploy

1. Push this repo to GitHub/GitLab.
2. In Netlify, click **Add new site → Import an existing project**.
3. Connect your repo. Build settings are in `netlify.toml` (publish dir = `.`, no build command).
4. Click **Deploy site**.

### Domain & HTTPS
Netlify provides a free `*.netlify.app` subdomain with automatic HTTPS.  
For a custom domain, go to **Site settings → Domain management**.

---

## Local development

No build step required. Just open `index.html` in a browser — but note that  
**ES modules require a server** (browsers block `file://` imports).

Quick options:
```bash
# Python
python -m http.server 8080

# Node (if installed)
npx serve .

# VS Code
# Install the "Live Server" extension and click "Go Live"
```

Then open `http://localhost:8080`.

---

## Project structure

```
/
├── index.html              ← Single-page app shell
├── css/
│   └── styles.css          ← All styles (no framework)
├── js/
│   ├── firebase-config.js  ← Firebase init + service exports
│   ├── auth.js             ← Login, register, logout, session watch
│   ├── app.js              ← Entry point, routing, shared state, utils
│   ├── announcements.js    ← Home tab + event banner
│   ├── directory.js        ← Neighbor directory tab
│   ├── schedule.js         ← Schedule timeline tab
│   ├── activities.js       ← Activity sign-up tab
│   ├── chat.js             ← Real-time chat tab
│   └── history.js          ← Past years gallery tab
├── firestore.rules         ← Firestore security rules
├── netlify.toml            ← Netlify deploy config
└── README.md
```

## Firestore collections

| Collection | Purpose |
|-----------|---------|
| `users` | Auth metadata: `uid`, `displayName`, `email`, `role`, `approved`, `createdAt` |
| `directory` | Public profiles: `uid`, `name`, `address`, `phone`, `email`, `notes` |
| `settings` | Site config — doc `event`: `date`, `time`, `location`, `theme`, `description` |
| `announcements` | Posts: `title`, `body`, `authorId`, `authorName`, `createdAt`, `reactions` |
| `schedule` | Time slots: `time`, `sortTime`, `title`, `description` |
| `activities` | Cards: `name`, `description`, `timeSlot`, `maxVolunteers`, `signups[]` |
| `chat` | Messages: `uid`, `displayName`, `message`, `createdAt` |
| `history` | Year entries: `year`, `theme`, `highlights`, `photos[]` |
