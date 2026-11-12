# ShasthoNote AI v0.5.0 — চালু করার বাংলা গাইড

এই গাইডটি Mac বা Linux terminal-এ project চালানোর জন্য। এটি একটি prototype health-record organizer; বাস্তব চিকিৎসা, রোগ নির্ণয় বা জরুরি সিদ্ধান্তের জন্য ব্যবহার করবে না। শুরুতে bundled synthetic demo data ব্যবহার করো।

## ১. প্রয়োজনীয় software

- Node.js 22.12 বা পরের সংস্করণ। এই repository-তে `.node-version` হলো `22.16.0`।
- Node-এর সঙ্গে আসা npm।
- Google sign-in ও Firestore configure করা Firebase project।
- AI feature চালাতে Gemini API key। শুধু guest demo ও non-AI feature চালাতে Gemini key প্রয়োজন নেই।

Terminal-এ version যাচাই করো:

```bash
node --version
npm --version
```

## ২. ZIP extract করে project folder-এ যাও

```bash
cd path/to/shasthonote-ai
pwd
```

`pwd` output-এর শেষে `shasthonote-ai` folder থাকা উচিত।

## ৩. Dependencies install করো

```bash
npm install
```

Registry বা DNS error হলে dependency install সম্পন্ন হয়নি। সে অবস্থায় build বা test-কে successful ধরে নিও না; network ঠিক করে আবার install করো।

## ৪. Environment file তৈরি করো

```bash
cp .env.example .env
```

`.env` ফাইলে AI feature ব্যবহার করলে নিজের Gemini API key বসাও:

```env
GEMINI_API_KEY="তোমার-Gemini-API-key"
GEMINI_MODEL="gemini-2.5-flash"
FIREBASE_PROJECT_ID="তোমার-Firebase-project-id"
PORT=3000
CSP_ENFORCE=false
```

`FIREBASE_PROJECT_ID` না দিলে server `firebase-applet-config.json`-এর project ID ব্যবহার করে। Client-side Firebase config-ও সেই project-এর সঙ্গে মিলতে হবে। `GEMINI_API_KEY` কখনো React code, `VITE_` environment variable বা GitHub repository-তে রাখবে না। `.env` Git-এ commit করবে না।

## ৫. Firebase Console-এ যাচাই

1. Authentication-এ Google provider enable করো।
2. Authentication → Settings → Authorized domains-এ `localhost` এবং তোমার deployed domain যোগ করো।
3. Firestore Database তৈরি/নির্বাচন করো।
4. এই repository-র `firestore.rules` পড়ো এবং Firebase Emulator দিয়ে test করো। Test না করে production rules publish কোরো না। ZIP-এ rules file থাকা মানে Firebase Console-এ rules publish হয়েছে—এমন নয়।

## ৬. App চালু করো

```bash
npm run dev
```

Browser-এ খোলো: `http://localhost:3000`

- **Guest demo:** sample data ও demo edit শুধু এই browser-এর local storage-এ থাকে। Guest mode protected AI endpoint call করতে পারে না।
- **Google sign-in:** account-এর records Firestore-এ UID দিয়ে আলাদা থাকে।
- **AI feature:** signed-in user-এর account-specific data-use notice accept করতে হয়; নির্বাচিত text/file server হয়ে Gemini API-তে যায়।

Gemini API key না থাকলে app shell চালু থাকতে পারে, কিন্তু AI request কাজ করবে না।

## ৭. Project check চালাও

```bash
npm run typecheck
npm test
npm run build
```

`npm test` utility unit test চালায়। এগুলো React browser flow, live Firebase rules বা Gemini API integration test নয়। `npm run preview` শুধু Vite build preview করে; Express API workflow যাচাই করতে `npm start`/deployment environment দরকার।

## ৮. Health Insights কীভাবে কাজ করে

Health Insights সর্বশেষ valid non-future vital reading, active medication date range, আসন্ন appointment এবং এক বছরের পুরোনো document দেখে deterministic observation তৈরি করে। সাত দিনের বেশি পুরোনো abnormal vital-কে current urgent alert হিসেবে দেখায় না। Invalid date/value, unsupported unit, incomplete blood-pressure pair বা future-dated vital current calculation-এ ব্যবহার না করে data-quality information দেখায়। এটি clinical validation নয়; সব result চিকিৎসকের সঙ্গে যাচাই করতে হবে।

## ৯. গুরুত্বপূর্ণ সীমাবদ্ধতা

- এটি medical device নয়, রোগ নির্ণয়/চিকিৎসা/ওষুধের dose নির্ধারণ করে না, এবং জরুরি অবস্থার বিকল্প নয়।
- AI output ও document extraction ভুল হতে পারে। Original report-এর সঙ্গে মিলিয়ে নাও।
- Firestore-এর IndexedDB cache encrypted vault নয়। Sign out করলেও browser cache থেকে যেতে পারে; shared browser profile ব্যবহার কোরো না।
- Service worker static app assets cache করে; AI request-এর জন্য internet লাগে।
- Firestore Emulator, live Firebase/Gemini, browser automation ও production deployment আলাদাভাবে যাচাই করতে হবে।

আরও তথ্য: [README](./README.md), [Architecture](./ARCHITECTURE.md), [API documentation](./API_DOCUMENTATION.md), [Security](./SECURITY.md), [Privacy](./PRIVACY.md), [Feature status](./FEATURE_ROADMAP.md)।
