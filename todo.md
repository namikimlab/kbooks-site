# 📘 KBooks Project Roadmap

*Book discovery platform built with Supabase, dbt, and Next.js.*

---

## 🚀 Phase 1: MVP — Core Functionality & Security

**🎯 Goal:** Public browsing + safe auth + stable ingestion.

### 🔒 Data & Governance

* [x] Move `raw_nl_books` to **private schema**
* [ ] Enable **RLS** for all public-facing tables (`books_public`, `recent_publish_books`, `book_likes`)
* [ ] Finalize **incremental dbt model** for `silver_books` (dedup + `fetched_at` logic)
* [x] Add dbt tests (`unique`, `not_null`) for key columns
* [x] Create indexes via dbt `post_hook` (`isbn13`, `title_trgm`, `tsv`)
* [ ] Add Metabase overview of data summary

### 🌐 Frontend

* [x] Build **Recent Books** page (using `recent_publish_books`)
* [x] Build **Book Detail** page (title, author, publisher, intro, cover)
* [x] Add working **Like / Unlike** button connected to Supabase

### 🔑 Auth

* [ ] Enable Supabase Auth (**MagicLink**, **Kakao**)
* [x] Protect like/unlike behind login redirect
* [x] Add `/login` page and redirect flow

✅ **MVP Done When:**
Users can browse books, view details, and like/unlike (if logged in), without exposing raw data.

---

## 🧱 Phase 2: v1.0 — Stability & Analytics

**🎯 Goal:** Full auth, richer content, automated updates.

### 🧩 Data Layer

* [ ] Add **Gold marts:**

  * `book_likes`
  * `book_like_counters`
  * `book_rankings_daily`, `book_rankings_weekly`, `book_rankings_monthly`
* [ ] Automate dbt job or Supabase cron (nightly run)
* [ ] Add **data validation & freshness tests**

### 🌐 Frontend

* [ ] Add **Home/Landing page** content (for Naver·Kakao verification)
* [ ] Add **About**, **Privacy Policy**, **Contact** pages (footer links)
* [ ] Add **custom 404/500 pages**

### 🔑 Auth

* [ ] Integrate **Naver** and **Kakao** login
* [ ] Add `user_profiles` table (nickname, created_at)
* [ ] Add “redirect to last page” post-login

### 🧰 Infra

* [ ] **Dockerize dbt** for reproducible builds
* [ ] Version-control DB migrations
* [ ] Add lightweight **Supabase monitoring** (disk usage, index size, query time)

✅ **v1.0 Done When:**
Fully-authenticated site with stable nightly updates and proper governance.

---

## ✨ Phase 3: Polish & Growth — UX, Speed, Visibility

**🎯 Goal:** Fast, searchable, and visually refined.

### 📈 Search & Performance

* [ ] Finalize **FTS** on `silver_books` (title + author)
* [ ] Add **search ranking**, pagination, and infinite scroll
* [ ] Implement caching (Supabase Edge Functions or client-side)

### 🎨 Frontend Polish

* [ ] Improve typography, spacing, and **mobile layout**
* [ ] Add **skeleton loaders** and empty-state components
* [ ] Strengthen **error handling** (network, 404, etc.)

### 📚 Docs & Showcase

* [ ] Write **blog post:** “How KBooks connects NLK data to Supabase with dbt”
* [ ] Add **architecture diagram** and deployment guide
* [ ] Include **demo dataset** or preview account

✅ **Public Launch Ready When:**
Search is fast, UX polished, backend documented — ready for public demo or investor review.

---

Would you like me to also generate a **`ROADMAP.svg` diagram** (phases → tasks → dependencies) for your GitHub README using Mermaid syntax? It’ll render visually right on GitHub.
