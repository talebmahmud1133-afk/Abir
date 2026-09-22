# PROJECT_PROGRESS.md — Home → "Courier Service"

**Scope:** ONLY the Home → Courier Service page (`courier.html`, `css/courier.css`, `js/courier.js`, `js/courier-data.js`). Nothing else.

**Version:** Courier module **v8.0 (demo offices managed by admin + auto-purge)** · ZIP **AABBV1-updated-v69**
**Site ?v= stamp:** `version.json` = `20260919043443` (unchanged this phase). Courier assets referenced from `courier.html` use `?v=20260919180000`.

> Note: the v61 ZIP had no `PROJECT_PROGRESS.md`; it had `project-update.md` (Phase 1 notes). This file supersedes it and carries Phase 1 forward. `project-update.md` was left untouched.

---

## Completed Tasks

### Phase 1 (from `project-update.md`, already in v61)
- `courier.html` rebuilt as a self-contained page: hero header, upazila dropdown, info bar, courier cards (initials logo, name, upazila, address, phone, Open/Closed badge, Google Map + Call buttons), footer strip.
- Responsive grid: 1 col mobile · 2 col tablet (≥640px) · 3 col desktop (≥1024px) · 4 col wide (≥1320px).
- `js/courier-data.js` (12 upazilas + 28 **demo** offices), `js/courier.js` (filtering + rendering + Bengali numerals), `css/courier.css`.

### Phase 2 (v62) — Top app bar + hero + toolbar
- **Top app bar is now back-only**, per the master prompt. Removed from this page only: site header (menu / bell / more menu / nav links), notice bar, category banner slider, old back-topbar, site footer, bottom nav, and the search/menu scripts that served them.
- **Back button** = pill "ফিরে যান" (44px tall) linking directly to `index.html` (spec: "returns to Home"; previously `history.back()`).
- **New hero** matching the provided mockup: sky-blue gradient, blue location pin, title "টাঙ্গাইল জেলার / কুরিয়ার সার্ভিস", subtitle "টাঙ্গাইল জেলার সকল কুরিয়ার অফিসের তথ্য", inline-SVG illustration (courier truck with parcels, plane, monument, trees, road). No image files; no extra requests.
  - Phones (<768px): illustration in a band under the text. ≥768px: text left, illustration right. ≥1024px: illustration at natural aspect ratio. Never cropped, never overlapping text (checked 320–1920px).
- **Toolbar** restyled to the mockup: selector card with blue pin (label "উপজেলা নির্বাচন করুন" kept visible for accessibility), info chips for total offices and last updated, full-width blue band "বর্তমানে দেখা হচ্ছে: …". Desktop: selector + chips share one row (≥900px).
- Page container widened to 1240px so the 4-column desktop grid actually has room (was capped at 1080px by shared `.wrap`; override is scoped to `.cr-wrap`).
- Trimmed this page's scripts to `courier-data.js`, `courier.js`, `auto-update.js`, `floating-buttons.js` (faster load; no Supabase/i18n/search on a page that doesn't use them).
- Verified in headless Chromium: filtering (28 → 6 for সদর → 2 for ভূঞাপুর), no JS errors, zero horizontal overflow at 320/360/390/600/768/1024/1280/1440/1920px, correct column counts.

### Phase 3 (v63) — Courier cards
- **Card layout per mockup:** logo tile on the left; company name + status badge on the first line; labelled rows **উপজেলা:**, **ঠিকানা:**, **মোবাইল:** with blue icons; full-width action row below.
- **Buttons:** solid **green Google Map** (opens Google Maps search for name + address) and solid **blue কল করুন** (`tel:` link). Both 46px tall (large touch target), with company-specific `aria-label`s (e.g. "Google Map — <name>").
- **Status badge:** solid green "খোলা" / red "বন্ধ" (white text, AA contrast). It is now shown **only if the record has a status** (`open` / `closed`); before, a missing status was shown as "open".
- **Logo tile:** new optional `logo` field on an office record (image path). If absent or the image fails to load, a coloured initial tile is shown. Colour is now derived from the **company name**, so the same company always has the same colour (before: by record id).
- **Phone:** displayed as `01712-345671` (11-digit numbers), `tel:` keeps the raw number. If a record has no phone, the phone row and call button are omitted (map button fills the row).
- Removed the hover lift on cards (shadow change only) to avoid jumpy cards on touch devices.
- Verified in headless Chromium: cards at 320–1440px have no overflow; logo-fail fallback, missing-status and missing-phone cases render correctly; no JS errors.

### Phase 4 (this ZIP) — Footer strip, empty state, accessibility, motion
- **Footer strip** per mockup: white rounded bar; left = calendar icon + "সর্বশেষ আপডেট: <date>", right = warning icon + "তথ্য ভুল? রিপোর্ট করুন" (link to `contact.html`, 44px touch target). One row on phones ≥ ~360px; wraps cleanly to two rows at 320px.
- **Empty state:** spans the full grid (it previously would have been squeezed into one column) and now has a button "সকল উপজেলার অফিস দেখুন" that resets the filter and moves focus back to the selector.
- **Keyboard focus:** the site-wide sky-blue focus ring measured only 2.3–2.8:1 on this page (below the 3:1 minimum). Scoped to this page only, focus is now a 3px dark-navy ring (≈9–11:1) on links, buttons and the selector. Shared CSS untouched.
- **Screen readers:** `aria-live` moved from the whole card grid (would have read every card on each filter change) to the short "বর্তমানে দেখা হচ্ছে: …" status band. Removed a redundant `aria-label` on the select (it already has a visible `<label>`). The grid has an `aria-label`.
- **Reduced motion:** `prefers-reduced-motion` disables all transitions/press-scale effects on this page.
- **Colour contrast (measured, WCAG):** white on green 5.3:1, white on blue 4.6:1, white on red 6.6:1, hero subtitle 6.5:1, muted labels 5.5:1 — all AA.
- `theme-color` for this page set to the light hero colour (`#eaf6ff`) so the phone status bar blends with the header.
- Full regression (title, subtitle, back link, 12+1 dropdown options, filtering, info bar, card fields, no site chrome, no JS errors) passed. Grid: 1 col <640px · 2 col ≥640px · 3 col ≥1024px · 4 col ≥1320px; no horizontal scroll from 320 to 1920px.

## Phase 5 (v65) — Courier company category bar (Continuation Prompt tasks 3–7)
Newly completed (nothing from Phases 1–4 was changed or repeated; header/hero untouched as instructed):
- **Category bar** (task 4) below the upazila selector: সব · সুন্দরবন · SA পরিবহন · জননী · রেডএক্স · পাঠাও · Steadfast · Paperfly · eCourier · Delivery Tiger · DHL. Phones: single row, swipe left/right (scrollbar hidden, snap, active chip auto-centred). Tablet/desktop (≥768px): chips wrap into rows, nothing hidden. 44px touch targets, `aria-pressed` state, navy focus ring reused.
- **Combined filters** (task 5): upazila AND company. Verified: মির্জাপুর + SA → 1 office; মির্জাপুর + সুন্দরবন → empty state.
- **Info bar** (task 6): the "বর্তমানে দেখা হচ্ছে" band now shows selected upazila **and** selected category with the result count; total offices and last-updated chips already existed.
- **Cards** (task 7): new "কুরিয়ার:" row showing the company (only when the office has a known company). Everything else on the card unchanged.
- **Empty state:** message names the selected company; button now "সকল অফিস দেখুন" and resets **both** filters.
- **Data:** new `window.COURIER_COMPANIES` list and optional `company` key on 21 of the 28 demo offices (matched by name). 7 offices (করতোয়া, কন্টিনেন্টাল, উত্তরণ) are not in the requested list, so they appear only under "সব". Steadfast, Paperfly, Delivery Tiger and DHL have no demo offices yet (show the empty state).
- Verified in headless Chromium at 320/390/768/1280px: no JS errors, no horizontal page overflow, bar scrolls on phones and wraps on ≥768px.

### Modified Files (Phase 5)
- `courier.html` — category bar markup, category in status band, courier asset `?v=` stamp.
- `js/courier.js` — category rendering, combined filter, company row, empty-state text/reset.
- `js/courier-data.js` — `COURIER_COMPANIES` + `company` keys (existing fields untouched).
- `css/courier.css` — category bar styles only.
- `PROJECT_PROGRESS.md` — this section + version line.
- Not modified: header/hero, all other pages, Firebase/Supabase, auth, admin, shared CSS/JS, `version.json`.

### Remaining (Continuation Prompt tasks 8–10, NOT started)
- Floating "+" button (bottom-right, always visible), Bottom-sheet form (company, upazila, office name, address, phone, map link, optional photo, Submit/Cancel), and submissions saved as **Pending Review** with admin-only approval. These need a Supabase table + admin approval tab (touches backend/admin) — waiting for your go-ahead.
- Real courier data still needed to replace demo offices.

## Phase 6 (v66) — Floating "+", add-office bottom sheet, Pending Review (Continuation Prompt tasks 8–10)
Newly completed (Phases 1–5 untouched):
- **Floating "+"** (task 8): fixed bottom-right, always visible, 58px, safe-area aware; page bottom padding keeps the last card clear of it. (Site's global back-to-top button is on the left — no overlap.)
- **Bottom sheet / modal form** (task 9): phones = sheet rising from the bottom (max 92% height, scrolls inside); ≥768px = centred modal. Fields: Courier Company (dropdown, includes "অন্যান্য" for companies not in the list), Upazila (dropdown), Office Name, Address, Phone, Google Map link (optional), Photo (optional, previewed, compressed, uploaded to the existing public `market-media` bucket under `courier/`). Buttons **জমা দিন / বাতিল**. Esc, backdrop tap and Cancel close it; focus is trapped inside and returned to "+"; body scroll locked; 16px inputs (no iOS zoom); 46–48px touch targets; inline Bengali validation (BD mobile/landline, http(s)-only map link, image-only ≤8MB); honeypot spam field; success screen "ধন্যবাদ! তথ্য জমা হয়েছে".
- **Pending Review flow** (task 10): the form inserts into Supabase `courier_offices` with `status:'pending'`. It does **not** appear on the page. **Backend change (approved by "Next"):** table already existed (0 rows); added `company` column, length limits, and tightened the public INSERT policy from `with check (true)` to `with check (status = 'pending')` — verified as the anon role that inserting `approved` is blocked and a normal insert works. Public SELECT stays `approved` only; admin (`is_admin()`) can manage all.
- **Approved offices go live:** approved rows are fetched (RLS: approved only) and merged into the list with the demo data; their own Google Map link and logo (https only) are used.
- Documented in `supabase/courier-schema.sql` (reference only).
- Verified in headless Chromium (Supabase mocked; the sandbox has no internet) at 320/390/768/1280px: no JS errors, no overflow, sheet fully inside viewport, validation messages, pending insert payload, success screen, Esc/focus, approved office merged and filterable.

### Modified Files (Phase 6)
- `courier.html` — "+" button, sheet markup, Supabase CDN + `supabase-config.js` + `courier-submit.js` script tags.
- `js/courier-submit.js` — **new**: form logic, upload, insert, approved-office loader.
- `js/courier.js` — uses an office's own `mapUrl`; re-renders on `courier:offices-updated`.
- `css/courier.css` — "+" and sheet styles only.
- `supabase/courier-schema.sql` — **new** (docs). Live DB: migration `courier_offices_company_and_pending_only_insert`.
- Not modified: header/hero, other pages, Firebase, auth, `admin.html`, shared CSS/JS.

### Remaining after Phase 6
- **Admin approval tab in `admin.html`** (list pending → approve / reject / delete), like the "দোকান" tab. Until then, approve in the Supabase dashboard: set `status = 'approved'` on the row in `courier_offices`.
- Real courier data still needed to replace demo offices.
- Not verified on a real device: live photo upload to `market-media` (same method as the shop form) and the CDN Supabase client.

## Phase 7 (v67) — Admin approval tab for courier offices (completes Continuation Prompt task 10)
Newly completed (Phases 1–6 untouched; `admin.html` touched only as approved by "Next"):
- **New "কুরিয়ার" tab in `admin.html`** (same pattern as the "দোকান" tab). Lists `courier_offices` rows; default filter = **পেন্ডিং**, plus সব / অনুমোদিত / বাতিল.
- Each card shows name, company, upazila, phone, address, a "Google Map লিংক যাচাই করুন" link (http/https only) and the photo, with actions: **অনুমোদন করুন** (`status='approved'` → appears on courier.html), **বাতিল করুন / তালিকা থেকে সরান** (`rejected`), **খোলা/বন্ধ** toggle for approved offices (`is_open`), **মুছুন** (confirm, also removes the uploaded photo from `market-media`).
- The publish path is now complete: "+" form → `pending` → admin approves → shown on the Courier Service page. Only admins (`is_admin()` RLS) can change status.
- Verified in headless Chromium (Supabase mocked) at 390/1280px: tab shows only its own panel, switching to another tab hides it, filters, approve / toggle send the right updates, no JS errors, no overflow.

### Modified Files (Phase 7)
- `admin.html` — tab button, `panelCourier` panel, `js/courier-data.js` script include (labels), courier admin JS block, one line at the top of `switchTab` to hide the new panel plus a `courier` branch. No existing tab/panel logic changed.
- `PROJECT_PROGRESS.md` — this section + version line.
- Not modified: everything else (courier page files, other pages, Firebase, auth, shared CSS/JS, DB — no new migration).

### Remaining after Phase 7
- Real courier data to replace the 28 demo offices in `js/courier-data.js` (or approve real submissions and delete the demo list later).
- Real-device check: photo upload, live Supabase connection, and one full test (submit → approve in admin → visible on the page). Sign in as an admin whose `profiles.role = 'admin'`.

## Phase 7.1 (v68) — Submit-flow verification + photo fix
- **Verified against the live Supabase project (test rows rolled back, nothing left in the DB):** as the `anon` role the form's exact payload inserts OK (also with an empty company for "অন্যান্য"); anon cannot see a `pending` row; after `approved` anon can see it; anon inserting `approved` is blocked by RLS. Anonymous upload to `market-media` is allowed (policy "anyone can upload market-media").
- **Bug found & fixed:** `market-media` accepts only JPEG/PNG/WebP/GIF, max 5 MB. The form used to accept any `image/*` (e.g. HEIC/SVG) and would have failed at upload. Now: file picker restricted to those types, clear Bengali message for others, 5 MB guard after compression.
- Modified: `courier.html` (photo `accept`, asset `?v=`), `js/courier-submit.js`. Nothing else.
- Still not testable from the sandbox (no internet): the browser → Supabase call on the real site. Do one real submit → admin approve → page check on a phone.

## Phase 8 (v69) — Demo offices: admin delete + auto-delete when real offices arrive
Requested: "admin should be able to delete demo accounts along with real ones / demo should go when real ones are added."
- **Demo data moved into the database:** the 28 demo offices now live in `courier_offices` with new column `is_demo = true` (status approved, so they show exactly as before). `js/courier-data.js` no longer contains the office list (`COURIER_OFFICES = []`); the page loads everything from Supabase, showing "অফিসের তালিকা লোড হচ্ছে…" until loaded.
- **Auto-delete (DB trigger `courier_purge_demo_trg`):** when a **real** office (is_demo = false) becomes `approved` in an upazila, all demo offices of **that upazila** are deleted immediately. Verified on the live DB (rolled back): pending real office → demo stays; approve → that upazila's demo gone (মির্জাপুর 2→0), other upazilas keep theirs (সদর still 6).
- **Admin "কুরিয়ার" tab:** demo offices carry a "ডেমো" badge, new filter **ডেমো অফিস**, per-office **মুছুন** (already existed) and a **"সব ডেমো মুছুন"** button (confirm dialog; real offices are never touched).
- **Security:** public INSERT policy is now `status = 'pending' AND is_demo = false` — visitors cannot submit demo/approved rows. Anonymous visitors can read the approved (incl. demo) rows only.
- Interpretation note: the request was read as "demo goes when real is added, and admin can also delete demo manually". If you meant a different rule (e.g. remove **all** demo as soon as any real office is approved, or per company), it is a one-line trigger change.
- Modified: `js/courier-data.js`, `js/courier.js` (loading state), `js/courier-submit.js` (loads all approved rows incl. demo), `courier.html` (`?v=`), `admin.html` (courier tab only), `supabase/courier-schema.sql` (docs), DB migration `courier_demo_rows_and_auto_purge`.

## Current Status
**All planned phases (1–4) are complete.** Page structure, hero, toolbar, cards, footer strip, empty state and accessibility match the master prompt and mockup. **The only thing between this and going live is real data** (see Remaining Tasks).

## Remaining Tasks
1. **Data (needs your input) — blocks going live:** replace the 28 demo offices in `js/courier-data.js` with real, verified data (name, upazila, address, phone, status; optional `logo` path). Update `window.COURIER_LAST_UPDATED` whenever data changes.
2. **Real-device check (recommended):** open on a phone and a desktop with internet, to confirm Font Awesome icons and the Hind Siliguri font render (they could not load in the offline test environment) and that the Google Map / call buttons open the right apps.
3. **Optional, only if you want live/admin-editable data:** a Supabase `courier_offices` table + admin tab, following the shop-directory pattern (would touch Supabase/admin, so it was NOT done without your go-ahead).
4. **Optional:** company logo files (`assets/couriers/…`) — cards pick them up automatically once paths are added to the data.

## Modified Files (Phase 4)
- `courier.html` — footer strip markup, `role="status"` band, `aria-label` changes, `theme-color`, courier asset `?v=` stamp.
- `js/courier.js` — empty-state markup + "show all" button handler.
- `css/courier.css` — footer strip, empty state, focus ring, reduced-motion.
- `PROJECT_PROGRESS.md` — updated.
- Not modified: `js/courier-data.js`, all other pages, Firebase/Supabase, auth, admin, shared CSS/JS, `version.json`.

## Modified Files (Phase 3)
- `js/courier.js` — new card markup, logo tile + fallback, phone formatting, status-only-if-present.
- `css/courier.css` — card styles rewritten (hero/toolbar untouched).
- `courier.html` — only the courier asset `?v=` stamp bumped.
- `PROJECT_PROGRESS.md` — updated.
- Not modified: `js/courier-data.js` (no schema change needed; `logo` is optional), all other pages, Firebase/Supabase, auth, admin, shared CSS/JS, `version.json`.

## Modified Files (Phase 2)
- `courier.html` — new app bar/hero markup, restructured toolbar, removed site chrome + unused scripts, courier asset `?v=` bumped.
- `css/courier.css` — new hero/toolbar/info styles, container width. Card styles untouched.
- `PROJECT_PROGRESS.md` — new.

Not modified in Phase 2: `js/courier.js`, `js/courier-data.js`, all other pages, Firebase/Supabase, auth, admin, shared CSS/JS, `version.json`.

## Next Recommended Step
Send the real courier data (and logos, if any) for a final data-entry phase, or answer the open questions below. If you are happy with demo data for now, run `python3 bump-version.py` and deploy.

## Open Questions / Decisions to Confirm
- **ভূঞাপুর:** Phase 1 added it as a 12th upazila (it was missing from your list of 11). Keep or remove?
- **Removed site chrome:** header, notice bar, banner, site footer and bottom nav are gone from this page only, to follow "Back button only / No extra navigation" and the mockup. Say so if you want the bottom nav or site footer back.
- **Demo data:** the offices, addresses and phone numbers are placeholders. Real company names with fake numbers should not go live as-is.
- **Logos:** real brand logos (Sundarban, Pathao, etc.) are not included. The card already supports a `logo` image path per office; supply approved files (e.g. in `assets/couriers/`) and they will show automatically.
- **Hero landmark:** the monument in the illustration is a stylised nod to the mockup. Tell me if you want a different Tangail landmark.

## Deploy Note
Run `python3 bump-version.py` before deploying (your normal routine). It was deliberately **not** run in Phases 2–4, because it rewrites every page and `version.json`.

## Known Issues
- Tested offline in headless Chromium: Font Awesome icons and Google Fonts did not load in the test, so please check icons and Bengali fonts on a real phone.
- The footer "রিপোর্ট করুন" link goes to the generic `contact.html`; it does not pre-fill which office is wrong (that would need changes to the contact page, which is outside this module).

## v86 — courier.html: ব্যাক-বার + ব্যানার স্থির (মোবাইল)
- css/courier.css: ≤700px স্ক্রিনে #catBannerWrap এখন sticky (ব্যাক-বারের ঠিক নিচে), .cr-top-area{display:contents}
- courier.html: ব্যাক-বারের উচ্চতা মেপে --cr-topbar-h সেট করার ছোট ইনলাইন স্ক্রিপ্ট; css ভার্সন বাম্প

## v87 — courier.html: ডিজাইন ফাইন-টিউনিং (শুধু css/courier.css + css ভার্সন)
- কার্ডের shadow আরও সফট (`0 2px 12px rgba(…,.05)`; hover `0 6px 20px rgba(…,.08)`)
- কার্ডের প্যাডিং ১৪px → ১৭px (`--cr-pad`); ছবির নেগেটিভ মার্জিনও `--cr-pad` থেকে আসে, তাই ছবি আগের মতোই কিনারা ছুঁয়ে থাকে
- Floating "+" বাটন ১২px উপরে (মোবাইল bottom 18→30px, ডেস্কটপ 28→40px)
- ক্যাটাগরি চিপের gap ৮px → ১২px
- "খোলা" ব্যাজ: ফন্ট 0.74→0.68rem, প্যাডিং 4/11→3/9px, রং #167a4f → #0f9d4a (উজ্জ্বল সবুজ)
- courier.html: courier.css `?v=20260920020000`

## v88 — courier.html: FAB, বাটন, ছবির কোণ (শুধু css/courier.css + css ভার্সন)
- Floating "+" বাটন নিচে-ডানে সরানো (মোবাইল right 16→12px, bottom 30→12px; ডেস্কটপ right 24px, bottom 22px) যাতে "কল করুন" বাটন না ঢাকে
- Google Map / কল করুন বাটন: উচ্চতা ফিক্সড 46px, line-height:1, nowrap, আইকন/লেখা vertically centered — দুটোই হুবহু সমান
- কার্ডের ছবি: চার কোণের radius কার্ডের radius (`--cr-radius`, 16px) এর সাথে মেলানো
- courier.css `?v=20260920030000`

## v89 — courier.html: FAB দূরত্ব + কার্ড ছবির উচ্চতা (শুধু css/courier.css + css ভার্সন)
- Floating "+" কিনারা থেকে আরও ৭px দূরে (মোবাইল right/bottom 12→19px; ডেস্কটপ right 31px, bottom 29px)
- কার্ডের ছবির উচ্চতা ১০px কমানো (`--cr-photo-trim: 10px`, ছবির নিচের margin) — মান বদলালেই কমবেশি করা যায়
- courier.css `?v=20260920040000`

## v90 — courier.html: ফাইনাল polish (css/courier.css, js/courier.js, courier.html ?v=)
- কার্ডের আইকন–লেখার ফাঁক ৮→৫px; আইকন প্রথম লাইনের ঠিক মাঝে (fixed height + flex center); ঠিকানার আইকন `fa-map-pin` → `fa-map-location-dot`
- দোকানের নাম: 1.02→1.07rem, line-height 1.35→1.25 (weight 700 — ফন্টে 800 নেই)
- "খোলা" ব্যাজ: ১px গাঢ় সবুজ border + হালকা shadow; Google Map বাটনের সাথে একই সবুজ `#0e9440` (hover `#0b7a36`)
- উপজেলা dropdown: উচ্চতা 48→45px
- কার্ড shadow: `0 3px 16px rgba(…,.04)`; hover `0 8px 24px rgba(…,.07)`
- কার্ডের ছবি: নির্দিষ্ট aspect ratio `--cr-photo-ratio: 4 / 5` (আগের `--cr-photo-trim` বাদ)
- Floating "+": 58→54px, কিনারা থেকে দূরত্ব ১৯px অপরিবর্তিত
- courier.css / courier.js `?v=20260920050000`

## v91 — courier.html (মোবাইল ≤700px): কার্ড ব্যানারের সমান চওড়া + ছবি Google Map পর্যন্ত
- কার্ড এখন বাম-ডান কিনারা পর্যন্ত (ব্যানারের লাইনে), কোণ সোজা, পাশের বর্ডার নেই; কার্ডের মাঝের gap 12px। ডেস্কটপ/ট্যাবলেট (>700px) অপরিবর্তিত
- কার্ডের ছবি আবার উপর থেকে Google Map বাটনের ঠিক উপর পর্যন্ত নামে (align-self: stretch); v90-এর 4:5 aspect-ratio বাদ
- courier.css `?v=20260920060000`

## v92 — courier.html (মোবাইল ≤700px): কার্ডের বাম পাশ ড্রপডাউন বক্সের লাইনে
- কার্ডের বাম কিনারা "উপজেলা নির্বাচন করুন" বক্সের বাম লাইনে (স্বাভাবিক ফাঁক + ১px বর্ডার, বাম কোণ গোল); ডান পাশ আগের মতোই কিনারা পর্যন্ত (ব্যানারের লাইনে, সোজা কোণ, বর্ডার নেই)
- v91-এর "ছবির কোণ সোজা" ওভাররাইড বাদ; ছবির কোণ আবার কার্ডের radius-এর সাথে মেলানো
- courier.css `?v=20260920070000`

## v93 — courier.html: ছবি ছাড়া অফিসের আদ্যক্ষর ব্লক হালকা
- js/courier.js: fallback ব্লকের ব্যাকগ্রাউন্ড এখন রঙের ~১২% (হালকা টিন্ট), আদ্যক্ষর পূর্ণ রঙে; আকার অপরিবর্তিত (ছবিওয়ালা কার্ডের সাথে সমান)
- courier.js `?v=20260920080000`

## v8 — নতুন পেজ matrimony.html (পাত্র-পাত্রী, ধাপ ০+১)
- কুরিয়ারের কাঠামোয় নতুন পেজ + `css/matrimony.css`, `js/matrimony-data.js`, `js/matrimony.js`; ৬টি চিপ: পাত্র · পাত্রী · ঘটক · অভিভাবক · বিবাহিত · বিবাহিতা; স্ট্যাটিক ডেমো ডাটা। বিস্তারিত ও পরের ধাপ: `CATEGORY_ROADMAP.md`

## v9 — matrimony.html (ধাপ ২)
- চিপ অনুযায়ী ৩ ধরনের কার্ড লেআউট (person/agent/guardian) + ছবির লাইটবক্স (`js/matrimony-lightbox.js`)। বিস্তারিত: `CATEGORY_ROADMAP.md`

## v10 — matrimony.html (ধাপ ৩)
- "+" ফ্লোটিং বাটন + bottom-sheet ফর্ম, চিপ/ধরন অনুযায়ী ফিল্ড ডাইনামিক (`js/matrimony-submit.js`, config `MM_TYPES[].form` + `MM_FORM_FIELDS`), বাংলা ভ্যালিডেশন, honeypot, ছবি ক্রপ+কম্প্রেস (কুরিয়ার থেকে কপি)। এখনো Supabase-এ সেভ হয় না — শুধু যাচাই ও প্রিভিউ। বিস্তারিত: `CATEGORY_ROADMAP.md`

## v11 — matrimony.html (ধাপ ৪)
- Supabase সংযোগ: ফর্ম জমা → `matrimony_entries` (status=pending, ছবি `market-media/matrimony/`), approved প্রোফাইল লোড (`js/matrimony-submit.js`), লাইভ RLS rollback-টেস্টে যাচাই। টেবিল/RLS/trigger migration আগেই লাইভ ছিল (`supabase/matrimony-schema.sql` রেফারেন্স)। বিস্তারিত ও পরের ধাপ (অ্যাডমিন ট্যাব): `CATEGORY_ROADMAP.md`

## v12 — admin.html (পাত্র-পাত্রী ধাপ ৫)
- নতুন অ্যাডমিন ট্যাব "পাত্র-পাত্রী (নতুন)" (`panelMatrimony`): `matrimony_entries`-এর পেন্ডিং/অনুমোদিত/বাতিল/ডেমো তালিকা, অনুমোদন-বাতিল-মুছুন (ছবিসহ), "সব ডেমো মুছুন"। ব্যাকএন্ড অপরিবর্তিত। বিস্তারিত ও পরের ধাপ (ধাপ ৬): `CATEGORY_ROADMAP.md`

## v13 — matrimony.html (ধাপ ৬ আংশিক: QA + polish)
- ৩২০–১৯২০px রেসপন্সিভ/অ্যাক্সেসিবিলিটি QA; WCAG AA কনট্রাস্ট ফিক্স (ব্র্যান্ড সবুজ #0f8a52 → #0c7a48, পাত্র-নীল #1d6fb8 → #1a66a8; শুধু `css/matrimony.css`, `js/matrimony-data.js`)। বাকি: ডেমো DB-তে + হোম কার্ড লিংক (ইউজারের অনুমতি সাপেক্ষ) — `CATEGORY_ROADMAP.md`

## v14 — হোম কার্ড লিংক নতুন পাত্র-পাত্রী পেজে
- `index.html` হোমের "পাত্র-পাত্রী" কার্ড, `sitemap.html`, `js/search-index.js`, `sitemap.xml` এখন `matrimony.html`-এ যায় (আগে পুরনো `matrimonial.html`)। পুরনো পেজ/ডাটা অক্ষত। বাকি: ডেমো DB-তে (অনুমতি সাপেক্ষ) — `CATEGORY_ROADMAP.md`

## v15 — পুরনো পাত্র-পাত্রী লেয়ার বাদ
- `/matrimonial`, `/matrimonial-register`, `/matrimonial-profile` এখন নতুন `matrimony.html`-এ redirect (`firebase.json` ৩০২ + পুরনো ৩ পেজের head-এ স্টাব)। ফাইল/ডাটা মোছা হয়নি। বাকি: পুরনো ৩টি approved প্রোফাইল নতুনে কপি, `profile.html`-এর পুরনো অংশ, ডেমো DB-তে — `CATEGORY_ROADMAP.md`

## v16 — রেকর্ড
- সিদ্ধান্ত: পুরনো ৩টি approved পাত্র-পাত্রী প্রোফাইল নতুন টেবিলে কপি হবে না (নতুন থেকে শুরু)। কোড অপরিবর্তিত; বিস্তারিত `CATEGORY_ROADMAP.md`

## v17 — matrimony.html: স্ট্যাটিক ডেমো সরানো (অ্যাডমিনে মুছলে পেজ থেকেও মুছবে)
- সমস্যা: `js/matrimony-submit.js`-এর লোডারে DB-তে ডেমো না থাকলে কোডে লেখা ১০টি স্ট্যাটিক ডেমো ফিরে আসত — তাই অ্যাডমিন "সব ডেমো মুছুন" করলেও পেজে থেকে যেত
- `js/matrimony-data.js`: ১০টি স্ট্যাটিক ডেমো মুছে `MM_DEMO_PROFILES = []`, `MM_PROFILES = []`
- `js/matrimony-submit.js`: স্ট্যাটিক ডেমো fallback বাদ; পেজ শুধু DB-র approved প্রোফাইল দেখায় (`MM_LOAD_FAILED` ফ্ল্যাগ যোগ)
- `js/matrimony.js`: লোড ব্যর্থ হলে "প্রোফাইল লোড করা যায়নি…" বার্তা; পুরো DB খালি হলে আলাদা বার্তা ("+" চেপে প্রথম প্রোফাইল যোগ করুন, "সব দেখুন" বাটন ছাড়া); ফিল্টারে খালি হলে আগের মতো "সব দেখুন"
- ব্যাকএন্ড/অ্যাডমিন/CSS অপরিবর্তিত; সাইটব্যাপী `?v=` bump


## v18 — পাত্র-পাত্রী: লগইন-বাধ্যতামূলক জমা + নিজের প্রোফাইল এডিট
- সিদ্ধান্ত (ইউজার): জমা দিতে লগইন বাধ্যতামূলক · এডিট করলে সরাসরি "অনুমোদিত" অবস্থাতেই আপডেট (পুনরায় অনুমোদন লাগবে না) · এডিটের জায়গা `profile.html`-এর "আমার পাত্র-পাত্রী প্রোফাইল" (নতুন `matrimony_entries`-এর সাথে সংযুক্ত)
- DB (লাইভে প্রয়োগ করা, রেফারেন্স `supabase/matrimony-owner-edit.sql`): insert শুধু `authenticated` + `user_id = auth.uid()`; মালিক নিজের এন্ট্রি select/update করতে পারে; BEFORE UPDATE trigger `matrimony_protect_owner_update` মালিককে status/is_verified/is_demo/user_id বদলাতে দেয় না (অ্যাডমিন পারে)
- `js/matrimony-submit.js`: "+" চাপলে লগইন না থাকলে `login.html?next=matrimony.html?new=1`-এ যায়; জমায় `user_id` বসে; নতুন এডিট মোড (`matrimony.html?edit=<id>`) — একই ফর্ম আগের তথ্য দিয়ে ভরা, ধরন লক, বর্তমান প্রোফাইল ছবি/আরও ছবি দেখায় (নতুন ছবি না বাছলে থাকে, আরও ছবি সরানো/বদলানো যায়), সংরক্ষণে `update` (status অপরিবর্তিত)
- `profile.html`: "আমার পাত্র-পাত্রী প্রোফাইল" এখন `matrimony_entries` থেকে (ছবি, নাম, ধরন, স্ট্যাটাস, "প্রোফাইল দেখুন" (approved হলে), "এডিট করুন", "আরেকটি প্রোফাইল যোগ করুন"); পুরনো `matrimonial_profiles`/`matrimonial-register.html` রেফারেন্স বাদ
- `css/matrimony.css`: `.mm-photo-edit[hidden]` ফিক্স

## v19 — পাত্র-পাত্রী: বিস্তারিত পেজ থেকেই মালিকের এডিট (ছবিসহ)
- সিদ্ধান্ত (ইউজার): কার্ডের "বিস্তারিত" খুললে, যার প্রোফাইল শুধু সে-ই "এডিট করুন" দেখবে ও প্রোফাইল ছবিসহ তথ্য এডিট করতে পারবে
- `js/matrimony-submit.js`: লগইন থাকলে নিজের এন্ট্রির আইডি (`window.MM_MY_IDS`, RLS-এ শুধু নিজের সারি আসে — পাবলিক ডাটায় `user_id` যোগ করা হয়নি) + `matrimony:edit` ইভেন্টে একই এডিট ফর্ম খোলে; সংরক্ষণের পর বন্ধ করলে পেজ রিফ্রেশ (হ্যাশ থাকায় বিস্তারিত পেজ নতুন তথ্যসহ আবার খোলে)
- `js/matrimony.js`: মালিক হলে বিস্তারিত পেজের নিচের বাটন-বারে "এডিট করুন"; Esc চাপলে ফর্ম খোলা থাকলে বিস্তারিত পেজ বন্ধ হয় না
- `css/matrimony.css`: `.mm-btn-edit` + বিস্তারিত পেজের উপরে এডিট শিট/ক্রপের z-index
- profile.html-এর "এডিট করুন" লিংক (`matrimony.html?edit=<id>`) আগের মতোই কাজ করে

## v19 — পাত্র-পাত্রী: বিস্তারিত পেজ থেকে মালিকের এডিট (পুরনো প্রোফাইলসহ)
- `matrimony.html`-এর কার্ডে ক্লিক করে খোলা "প্রোফাইলের বিস্তারিত" পেজে শুধু প্রোফাইলের মালিক (লগইন করা, `user_id` মেলে) "এডিট করুন" বাটন দেখে → একই ফর্ম এডিট মোডে (প্রোফাইল ছবি ও আরও ছবিসহ) খোলে। সংরক্ষণের পর পেজ রিফ্রেশ হয়ে নতুন তথ্য/ছবি দেখায়; status অপরিবর্তিত (approved থাকলে approved-ই)।
- মালিক শনাক্তে `user_id` পাবলিক ডাটায় আনা হয়নি — `js/matrimony-submit.js` লগইন করা ইউজারের নিজের এন্ট্রির আইডি পড়ে `window.MM_MY_IDS` বানায় (RLS নিজের সারিই দেয়); `js/matrimony.js` সেটা দেখে বাটন বসায়।
- পুরনো প্রোফাইল (লগইন-বাধ্যতামূলক হওয়ার আগে জমা, `user_id` ফাঁকা): অ্যাডমিন → পাত্র-পাত্রী (নতুন) → কার্ডে "মালিক নির্ধারণ করুন/মালিক বদলান" (ইউজারের ইমেইল দিয়ে) — এরপর ওই ইউজারই এডিট করতে পারে। মালিক না থাকলে কেউ এডিট করতে পারে না। (`admin.html`)
- `css/matrimony.css`: `.mm-btn-edit` + বিস্তারিত পেজের উপরে এডিট শিট (z-index)।

## v20 — সাইটব্যাপী অডিট (রেফারেন্স: `supabase/security-audit-2026-09-20.sql`)
- ব্যানার/নোটিশ/পপআপ/সাইট-নোটিশ/লিস্টিং: লগইন করা সাধারণ ইউজারও এখন দেখে; রিভিউ/রেটিং টেবিলে SELECT grant যোগ
- **নিরাপত্তা ফিক্স:** পাবলিক (গেস্ট) API দিয়ে সরাসরি `status='approved'`/`verified=true` ঢুকিয়ে অনুমোদন বাইপাস করতে পারত (shops, jobs, hospitals, doctors, tuition_posts, ambulance_providers, listings, teachers/students-verified) — আটকানো হয়েছে; সাইটের ফর্ম আগের মতোই চলে
- matrimony_entries: age 18–80, experience 0–60 DB constraint
- খোলা (ঝুঁকি কম / সিদ্ধান্ত লাগবে): trigger-ফাংশন RPC-তে দৃশ্যমান, leaked-password protection বন্ধ, ~~`post_likes` DELETE সবার জন্য~~ (v21-এ ঠিক করা হয়েছে), ~~পুরনো ছবি স্টোরেজে জমে থাকা (এডিটে ছবি বদলালে)~~ (v22-এ ঠিক করা হয়েছে)

## v21 — post_likes: আনলাইক শুধু যে লাইক করেছে সে-ই করতে পারবে (রেফারেন্স: `supabase/post-likes-owner-only.sql`)
- সমস্যা: `post_likes`-এর DELETE পলিসি `using (true)` আর SELECT পাবলিক (device_id সবাই পড়তে পারত) → যে কেউ যেকোনো লাইক মুছতে পারত।
- সমাধান: `unlike_post(p_post_id, p_device_id)` ফাংশন (security definer) — শুধু (পোস্ট + ডিভাইস আইডি) মিললে সেই লাইক মোছে, অন্যের লাইক না। `posts.html` ও `post-view.html` এখন সরাসরি টেবিল থেকে delete না করে `client.rpc('unlike_post', ...)` কল করে।
- ধাপ ১ (ফাংশন যোগ) লাইভ ডাটাবেসে প্রয়োগ করা হয়েছে (টেস্টেড: ভুল ডিভাইস → মোছে না, আসল ডিভাইস → মোছে)।
- ধাপ ২ (তালা): সাইট ডিপ্লয়ের পর `post-likes-owner-only.sql`-এর "ধাপ ২" অংশ চালাতে হবে — পাবলিক DELETE/SELECT পলিসি সরানো, anon-এর select/delete revoke, অ্যাডমিনের জন্য is_admin() পলিসি। (আগে চালালে পুরনো ক্যাশড পেজে আনলাইক কাজ করবে না।)
- লাইক দেওয়া (INSERT) আগের মতোই; লাইক সংখ্যা `posts.like_count` (ট্রিগার) থেকে আসে, `post_likes` পড়তে হয় না।

## v22 — পুরনো ছবি স্টোরেজে জমে থাকা বন্ধ (কোনো ডাটাবেস পরিবর্তন লাগেনি)
- মূল কারণ: `js/matrimony-submit.js` ও `js/market-post.js` ছবি আপলোড করত anon কী দিয়ে → ফাইলের `owner` ফাঁকা → `market_media_owner_delete` (owner = auth.uid()) পলিসি কখনো মিলত না → শুধু অ্যাডমিন মুছতে পারত। (লাইভে market-media-র ২৮টি ফাইলের সবগুলোর owner ফাঁকা ছিল)
- ফিক্স: আপলোড এখন লগইন করা ইউজারের সেশন টোকেনে হয় (owner = ইউজার)। বাকেট সবার জন্য মোছার অনুমতি খোলা হয়নি — শুধু মালিক নিজের ফাইল মুছতে পারে।
- `js/matrimony-submit.js`: এডিট সেভ সফল হওয়ার পরে যে ছবি বদলেছে/বাদ পড়েছে (মূল + অতিরিক্ত) `matrimony/` ফোল্ডার থেকে সেগুলো মোছে (`removeReplacedPhotos`, best-effort — ব্যর্থ হলে ইউজারের সেভ আটকায় না)।
- `js/market-post.js`: নতুন লিস্টিংয়ের ছবিও owner-সহ; `profile.html`-এ লিস্টিং মুছলে ছবি মোছার যে কোড আগে থেকেই ছিল তা এখন সত্যিই কাজ করবে।
- সীমা: আগে আপলোড হওয়া ফাইল (owner ফাঁকা) মালিক মুছতে পারবে না — সেগুলো অ্যাডমিন থেকে মুছতে হবে। doctors/lawyer/courier/shops-এর জমা গেস্ট (anon) ফর্ম, সেখানে এডিটে ছবি বদলানোর সুবিধাই নেই, তাই আলাদা সমস্যা নেই।

## v23 — পাত্র-পাত্রী: গোপন ফোন ডাটাবেসেই লুকানো (রেফারেন্স: `supabase/matrimony-phone-privacy.sql`)
- সমস্যা: `phone_public=false` শুধু JS-এ মানা হতো; পাবলিক পলিসি সব কলাম দিত, তাই anon key দিয়ে API ডাকলেই গোপন ফোন পাওয়া যেত (anon key ব্রাউজারে প্রকাশ্য, ডিজাইনেই)।
- সমাধান: `public.matrimony_public` ভিউ (approved সারি; `phone` শুধু `phone_public=true` হলে, নইলে null; `user_id`/`status` নেই; `security_barrier`; শুধু SELECT grant)। `js/matrimony-submit.js`-এর `fetchApproved` এখন এই ভিউ থেকে পড়ে।
- ধাপ ১ (ভিউ) লাইভে প্রয়োগ + গেস্ট হিসেবে টেস্টেড (গোপন ফোন null, প্রকাশ্য ফোন আসে, ভিউ দিয়ে insert/update/delete বন্ধ)।
- ধাপ ২ (তালা): সাইট ডিপ্লয়ের পর `matrimony-phone-privacy.sql`-এর "ধাপ ২" চালাতে হবে — টেবিলের পাবলিক-read পলিসি বাদ + anon-এর select revoke। এরপর মালিক শুধু নিজের সারি (প্রোফাইল/এডিট) আর অ্যাডমিন সব সারি টেবিল থেকে পড়ে; বাকিরা ভিউ থেকে।
- নোট: Supabase অ্যাডভাইজার এই ভিউকে "Security Definer View" (ERROR) দেখাবে — ইচ্ছাকৃত: ভিউটাকে RLS পেরিয়ে পড়তে হয় ফোন মাস্ক করার জন্য; সুরক্ষা: শুধু approved সারি, ফোন মাস্ক, লেখার অনুমতি নেই।
- `whatsapp` কলাম পাবলিক থাকে (ফর্মে ঐচ্ছিক, "হোয়াটসঅ্যাপ" বাটন হিসেবে দেখানো হয় — ডিজাইনেই)। পুরনো `matrimonial_profiles` টেবিলের `phone`-এ সম্মতি-ফ্ল্যাগ নেই, তাই আলাদা রাখা হয়েছে।


## v103 — মেসেজিং সিস্টেম সম্পূর্ণ (ধাপ ১–৫; রেফারেন্স: `MESSAGING_PROGRESS.md`, `supabase/messages-schema.sql`, `chat-media-storage.sql`, `chat-media-admin-cleanup.sql`)
- profile.html-এর "মেসেজ" ট্যাব এখন পূর্ণ ১-টু-১ মেসেজিং: চ্যাট পেজ (`chat.html`), ইনবক্স/রিকোয়েস্ট, রিয়েলটাইম + পোলিং, ইমোজি, ছবি/ভিডিও, রিঅ্যাকশন, Seen, না-পড়া ব্যাজ (বটম-নেভসহ), কথোপকথন মোছা, ব্লক/আনব্লক, অ্যাডমিন চ্যাট-মিডিয়া ক্লিনআপ।
- লাইভ DB: `messaging_step1_chat_schema`, `chat_media_bucket_and_policies`, `chat_media_delete_own_policy`, `chat_media_admin_cleanup`, `chat_media_admin_orphan_only_policies`।
- নিরাপত্তা: ক্লায়েন্ট শুধু SELECT (participant-only RLS), সব লেখা `SECURITY DEFINER` RPC-তে; anon বন্ধ; মিডিয়া প্রাইভেট বাকেট; অ্যাডমিন শুধু অনাথ ফাইল দেখে।
- যাচাই: মক Supabase + headless Chromium-এ পূর্ণ পরীক্ষা; আসল ডিভাইস/দুই আসল অ্যাকাউন্টে যাচাই বাকি (চেকলিস্ট `MESSAGING_PROGRESS.md`-এর শেষদিকে)।
- খোলা ঐচ্ছিক কাজ: চ্যাট RLS-এ `(select auth.uid())` ও ৩টি FK ইনডেক্স (বড় স্কেলে)।

## v104 — চ্যাট পারফরম্যান্স-টিউনিং (রেফারেন্স: `supabase/chat-performance.sql`)
- লাইভ migration `chat_rls_initplan_and_fk_indexes`: চ্যাটের ৪টি RLS পলিসিতে `(select auth.uid())` + ৩টি FK ইনডেক্স। অ্যাক্সেস-নিয়ম অপরিবর্তিত (rolled-back টেস্টে যাচাই)। অন্য টেবিলের লিন্ট ছোঁয়া হয়নি।

## v109 — চ্যাটে মেসেজ অ্যাকশন (কপি · রিপ্লাই · ফরওয়ার্ড · এডিট · ডিলিট) (রেফারেন্স: `MESSAGING_PROGRESS.md`, `supabase/chat-message-actions.sql`)
- `chat.html`/`css/chat.css`/`js/chat.js`: দীর্ঘ চাপে মেসেজ নির্বাচন + হেডারে ⋮ মেনু; রিপ্লাই-উদ্ধৃতি, এডিট-মোড, ডিলিট/ফরওয়ার্ড বটম-শিট, রিয়েলটাইমে অন্যের এডিট/মোছা। DB লাইভে আগে থেকেই (`chat_message_actions`); এই সেশনে DB বদল নেই।
- যাচাই: মক Supabase + headless Chromium ১১৭ চেক পাস; আসল ডিভাইসে যাচাই বাকি (`MESSAGING_PROGRESS.md`)।

## v113–v114 — প্রোফাইলে ফ্রেন্ডস সবসময় দৃশ্যমান (v113) + ফেভারিট ক্যাটাগরি (♡) (রেফারেন্স: `supabase/favorite-categories.sql`, `js/favorite-categories.js`)
- `profile.html`: "ফ্রেন্ডস" বক্স "তথ্য" ট্যাবের ভেতর থেকে বের করে সব ট্যাবের নিচে আনা হয়েছে (৪টি ট্যাবেই সবসময় দেখা যায়)।
- হোম পেজের ৩৬টি ক্যাটাগরি কার্ডের ডান-উপরে ♡; চাপলে ফেভারিটে যায়/সরে (পেজ খোলে না)। প্রোফাইলে ফ্রেন্ডসের নিচে "ফেভারিট ক্যাটাগরি" গ্রিড (ছোট ♥ চাপলে সেখান থেকেও সরানো যায়)।
- সংরক্ষণ: localStorage (`tz_fav_cats_v1`) সবসময়; লগইন করা থাকলে নতুন টেবিল `favorite_categories` (RLS: শুধু নিজের সারি)। ⏳ **SQL এখনো লাইভ Supabase-এ প্রয়োগ হয়নি** — চালানোর আগে ফেভারিট শুধু ঐ ব্রাউজারে থাকে; চালানোর পর লোকালের ফেভারিট নিজে থেকে অ্যাকাউন্টে উঠে যায়।
- অন্য ইউজারের ক্যাশ কখনো দেখানো/মেশানো হয় না (ক্যাশে owner ট্যাগ)। যাচাই: মক Supabase + headless Chromium; আসল ডিভাইসে যাচাই বাকি।

## v133 — চ্যাটে WhatsApp-স্টাইল Seen Status টিক (কোনো ডাটাবেস পরিবর্তন লাগেনি)
- আগে (v103) নিজের শেষ-দেখা মেসেজের নিচে "দেখা হয়েছে · সময়" টেক্সট দেখাত। এখন প্রতিটা নিজের মেসেজের সময়ের পাশে ছোট টিক আইকন (কোনো বাড়তি টেক্সট নেই, শুধু আইকনের রঙ বদলায়):
  - Sent (পাঠানোর সাথে সাথে, সার্ভার-নিশ্চিতের আগে) — একটা টিক (✓), ধূসর `#9CA3AF`
  - Delivered (সার্ভারে সংরক্ষিত হয়েছে, এখনো `read_at` নেই) — দুইটা টিক (✓✓), ধূসর `#9CA3AF`
  - Seen (`read_at` সেট হয়েছে) — দুইটা টিক (✓✓), নীল `#3B82F6`
- ডাটাবেসে কোনো নতুন কলাম/মাইগ্রেশন লাগেনি — বিদ্যমান `chat_messages.read_at` (v103) ও বিদ্যমান `mark_read` RPC + Realtime (`chat_messages` UPDATE সাবস্ক্রিপশন) দিয়েই কাজ হয়েছে। Delivered-এর জন্যও আলাদা কলাম লাগেনি: `m.tmp` (স্থানীয় আশাবাদী কপি) থেকে সার্ভার-নিশ্চিত মেসেজে বদলানোটাই "delivered" হিসেবে ধরা হয়েছে।
- পরিবর্তিত ফাইল: `js/chat.js` (`buildTicks()` নতুন ফাংশন; `buildRow()`-এ সময়ের পাশে টিক বসানো; পুরনো টেক্সট-ভিত্তিক "দেখা হয়েছে" ব্লক ও `seenId` হিসাব সরানো হয়েছে — লজিক অপরিবর্তিত, শুধু UI), `css/chat.css` (`.chat-meta` flex র‍্যাপার, `.chat-ticks-*` রঙ; পুরনো `.chat-seen` ক্লাস সরানো হয়েছে)।
- Realtime আগে থেকেই চালু ছিল (`supabase_realtime` পাবলিকেশনে `chat_messages`) — রিসিভার চ্যাট খুলে `mark_read` কল করলে সেন্ডারের স্ক্রিনে Realtime UPDATE দিয়ে টিক রিফ্রেশ ছাড়াই নীল হয়ে যায়।
- অন্য কারো মেসেজে (theirs) কোনো টিক দেখা যায় না — শুধু নিজের পাঠানো মেসেজে। মোবাইল ও ডেস্কটপ একই কোডপথ, আলাদা কিছু লাগেনি।

## v134 — Seen টিকের রঙ/সাইজ আরও স্পষ্ট (রিয়েল-ডিভাইস ফিডব্যাক অনুযায়ী, শুধু CSS)
- সমস্যা: গাঢ় সবুজ বাবলের ওপর `#9CA3AF` ধূসর আর `#3B82F6` নীল — বাস্তব মোবাইল স্ক্রিনে দুটো রঙ কাছাকাছি লাগছিল, seen/unseen আলাদা করে বোঝা কঠিন ছিল।
- ফিক্স (`css/chat.css`): আইকন সাইজ `0.72rem → 0.82rem`; sent/delivered-এর রঙ হালকা রূপালি-ধূসর `#D6DBE3` (গাঢ় সবুজে আগের চেয়ে বেশি স্পষ্ট); seen-এর রঙ উজ্জ্বল আকাশি-নীল `#4FC3F7` (সাথে সামান্য `drop-shadow` যাতে যেকোনো ব্যাকগ্রাউন্ডেও ঝাপসা না লাগে)। কালার-লজিক (কখন কোনটা দেখাবে) অপরিবর্তিত।

## v135 — Re-Friend (Friend History) সিস্টেম: আগে ফ্রেন্ড ছিল হলে সঙ্গে সঙ্গে আবার ফ্রেন্ড (রেফারেন্স: পুরনো সেশনের ব্যাকএন্ড + এই সেশনে ক্লায়েন্ট-ওয়্যারিং)
- **লক্ষ্য:** কোনো দুইজন ইউজার জীবনে একবার Friend হলে, Unfriend করার পর আবার Add Friend চাপলে নতুন Friend Request না গিয়ে সঙ্গে সঙ্গে আবার Friend হয়ে যাবে (কোনো Notification ছাড়া)।
- **ব্যাকএন্ড (আগের সেশনে অন্য অ্যাকাউন্টে লাইভ Supabase-এ প্রয়োগ হয়েছিল — migration `re_friend_history_system`, `re_friend_history_system_v2`; এই সেশনে শুধু যাচাই করা হয়েছে, নতুন DB পরিবর্তন লাগেনি):**
  - নতুন টেবিল `public.friend_history` (`user1`, `user2` — সবসময় ছোট UUID আগে রাখা হয় `least()/greatest()` দিয়ে যাতে ডুপ্লিকেট না হয়; `ever_friends boolean`; `first_friend_at`) — কখনো ডিলিট হয় না।
  - `respond_friend_request(p_username, p_accept)`: Accept করলে `friend_history`-তে `on conflict do nothing` দিয়ে রেকর্ড বসায় (প্রথমবার Friend হওয়ার প্রমাণ, স্থায়ী)।
  - নতুন RPC `add_friend(p_username)` (SECURITY DEFINER): `friend_history`-তে `ever_friends=true` থাকলে পুরনো `follows` সারি মুছে সরাসরি `status='accepted'` insert করে (`app.refriend_bypass` সেশন-ফ্ল্যাগ সেট করে) এবং `'accepted'` রিটার্ন করে; না থাকলে আগের মতোই `pending` insert করে `'pending_sent'` রিটার্ন করে।
  - ট্রিগার `enforce_follow_rate_limit` ও `trigger_push_on_follow` উভয়ে `app.refriend_bypass` চেক করে রি-ফ্রেন্ডের বেলায় rate-limit ও push আটকায় (স্প্যাম-প্রবণ নতুন "রিকোয়েস্ট" নয় বলে); `trg_push_friend_request` এমনিতেই শুধু `status='pending'`-এ পুশ পাঠায়, তাই accepted insert-এ পুশ যায় না।
- **ক্লায়েন্ট (এই সেশনে করা — সমস্যা ছিল: তিন জায়গায় Add Friend বাটন এখনো পুরনো সরাসরি `follows` টেবিলে insert করছিল, নতুন `add_friend` RPC কল করছিল না, তাই রি-ফ্রেন্ড কাজ করছিল না):**
  - `js/public-profile.js` — অন্যের প্রোফাইলের Add Friend বাটন: `client.from('follows').insert(...)` বাদ দিয়ে `client.rpc('add_friend', {p_username})` কল; রেজাল্ট `'accepted'` হলে বাটন সরাসরি সবুজ **Friend** + বার্তা "আপনারা আবার ফ্রেন্ড হয়েছেন।", নাহলে আগের মতো **Friend Request** (হলুদ)।
  - `js/chat.js` — চ্যাটের "Add Friend" ব্যানার (রিসিভার-সাইড): একই বদল — RPC-এর রেজাল্ট `'accepted'` হলে "আপনারা আবার ফ্রেন্ড হয়েছেন — চ্যাট চালু।" দেখিয়ে সঙ্গে সঙ্গে ব্যানার সরে চ্যাট চালু হয় (Pending অবস্থায় যায় না)।
  - `profile.html` — নিজের প্রোফাইলের "Add Friend" ট্যাবের সদস্য-তালিকা বাটন: একই বদল; বাটনের পরবর্তী অবস্থা (`next`) ও বার্তা (`okText`) এখন RPC রেজাল্ট দেখে ঠিক হয় (আগে থেকেই ধরে নেওয়া হতো না)।
  - তিন জায়গাতেই পুরনো "23505 (duplicate) মানে সফল" ধরে নেওয়ার হ্যাক বাদ দেওয়া হয়েছে — `add_friend` RPC নিজেই `on conflict do nothing` সামলায়, তাই দরকার নেই।
- **Notification:** প্রথমবার Friend Request পাঠালে আগের মতোই Push যায়; Re-Friend (RPC-এর `'accepted'` রেজাল্ট) হলে কোনো Push যায় না (ট্রিগার লেভেলে আটকানো) — শুধু ক্লায়েন্টে লোকাল বার্তা দেখানো হয়।
- **Compatibility:** বিদ্যমান Friend/Unfriend, Notification, বেল-ব্যাজ, Chat, Call, Friend List, Mutual Friends, Profile ফ্লো অপরিবর্তিত — শুধু "প্রথমবার Add Friend চাপা" মুহূর্তে RPC বদলেছে; বাকি সব পাথ (Accept/Reject/Unfriend/Cancel) আগের মতোই।
- **যাচাই এই সেশনে:** তিনটি ফাইলের JS/HTML সিনট্যাক্স চেক (Node `-c`) পাস; লাইভ ডাটাবেসে ফাংশন/ট্রিগার সংজ্ঞা পড়ে নিশ্চিত করা হয়েছে যে ব্যাকএন্ড লজিক নিয়মের সাথে মেলে। **আসল দুই অ্যাকাউন্টে বাস্তব যাচাই বাকি:** A ও B আগে একবার Friend হোন → Unfriend করুন → B-র প্রোফাইলে/চ্যাটে/A-র "Add Friend" ট্যাবে A থেকে আবার Add Friend চাপুন → সঙ্গে সঙ্গে "Friend" দেখায় কি না, B-র বেলে কোনো নতুন Friend Request notification আসে কি না, দুজনের Friend List/চ্যাট সঙ্গে সঙ্গে আপডেট হয় কি না।
- **পরিবর্তিত ফাইল:** `js/public-profile.js`, `js/chat.js`, `profile.html` (JS-only পরিবর্তন, কোনো CSS/DB ফাইল বদলায়নি এই সেশনে)। সাইটব্যাপী `?v=` bump (`20260922123933`)।
