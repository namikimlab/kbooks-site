## ✅ kBooks Social Login Preparation Checklist

### 🏗️ 1. Environment & Domain Setup

* [ ] Deploy kBooks site to a **public domain** (e.g. `https://kbooks.site` or Netlify/Vercel custom domain)
* [ ] Ensure **HTTPS** is active (SSL certificate)
* [ ] Confirm your domain matches exactly what will be used in Naver/Kakao console
  *Example: `https://kbooks.site`, not `http://` or a subpath*
* [ ] Add a visible **front page** with at least:

  * [x] Hero title (“Discover and Share Books in Korea”)
  * [ ] Featured “Silver Books” section (3–5 sample titles)
  * [ ] “Login with Naver” and “Login with Kakao” buttons (placeholders OK for now)
  * [x] Footer with “About”, “Privacy Policy”, “Contact”

---

### 🔐 2. Naver Developer Console Setup

* [ ] Go to [Naver Developers Console](https://developers.naver.com/apps/#/register)
* [ ] Create a **new application**

  * [ ] App name: `kBooks`
  * [ ] Service URL: your deployed site (e.g. `https://kbooks.site`)
  * [ ] Callback (redirect) URL: e.g. `https://kbooks.site/api/auth/callback/naver`
* [ ] Enable **“네이버 아이디로 로그인”**
* [ ] Check permissions: only request **email** and **nickname** for now
* [ ] Copy the **Client ID** and **Client Secret** into `.env.local`

  ```
  NAVER_CLIENT_ID=xxxxx
  NAVER_CLIENT_SECRET=xxxxx
  ```
* [ ] Configure your app (NextAuth, Supabase Auth, etc.) to support the Naver provider

---

### 💛 3. Kakao Developer Console Setup

* [ ] Go to [Kakao Developers Console](https://developers.kakao.com/console/app)
* [ ] Create a **new app**: `kBooks`
* [ ] Under “Kakao Login” settings:

  * [ ] Enable Kakao Login
  * [ ] Register redirect URI:
    e.g. `https://kbooks.site/api/auth/callback/kakao`
* [ ] Get **REST API Key** and **Client Secret**
* [ ] Add them to `.env.local`

  ```
  KAKAO_CLIENT_ID=xxxxx
  KAKAO_CLIENT_SECRET=xxxxx
  ```
* [ ] Configure your app’s auth logic to include Kakao provider

---

### 🧱 4. Front-End Integration

* [ ] Place buttons visibly on front page and/or `/login` route

  * [ ] ✅ “네이버 아이디로 로그인” button (official green style or similar)
  * [ ] ✅ “카카오로 로그인” button (official yellow style or similar)
* [ ] Add a **hover or tooltip** showing “Login with your Naver/Kakao account”
* [ ] Ensure they call your auth provider endpoint (`/api/auth/signin/naver` or `/api/auth/signin/kakao`)
* [ ] After successful login, redirect to `/profile` or `/books`

---

### 📄 5. Legal & Content Requirements

* [ ] Create `/privacy` page (basic template fine)
* [ ] Create `/terms` page (optional but recommended)
* [x] Add `/contact` or footer email (for reviewer)
* [x] Add `/about` explaining “kBooks” concept
* [ ] Confirm the site shows **real content** (not just placeholders)

  * [ ] Use sample data from `silver_books` for visible listings

---

### 🧪 6. Verification Readiness

* [ ] Ensure:

  * [ ] The **Naver** login button works from the live site (redirect completes)
  * [ ] The **Kakao** login button works from the live site
  * [ ] The reviewer can browse your books **without login**
  * [ ] The reviewer can **login** successfully and see basic profile
* [ ] Capture 3 screenshots for submission:

  1. Front page with visible login buttons
  2. Naver/Kakao consent screen
  3. Logged-in success screen
* [ ] Submit for review to Naver (and later Kakao)

---

Would you like me to make a second version that fits **Next.js + NextAuth + Supabase Auth** specifically (i.e., exact env variable names, callback paths, and setup order)?
That would give you a ready-to-follow technical checklist next.
