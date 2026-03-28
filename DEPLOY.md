# JARVIS-OS Deployment Guide

Step-by-step deployment instructions. Follow in order.

---

## Step 1: Supabase (Database + Auth)

### 1.1 Create Project
1. Go to **[supabase.com/dashboard](https://supabase.com/dashboard)**
2. Click **"New Project"**
3. Choose your organization
4. **Name:** `personaljarvis`
5. **Database Password:** Generate a strong password and **save it**
6. **Region:** Choose closest to your users
7. Click **"Create new project"** — wait 2 minutes

### 1.2 Run Migrations
1. Click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open `supabase/migrations/001_initial_schema.sql` from this repo
4. Copy the **entire file contents** and paste into the SQL editor
5. Click the green **"Run"** button
6. Verify: "Success. No rows returned" message appears
7. Click **"New query"** again
8. Open `supabase/migrations/002_trial_support.sql`
9. Copy, paste, click **"Run"**
10. Verify success

### 1.3 Verify Tables
1. Click **"Table Editor"** in the left sidebar
2. You should see 3 tables: `subscriptions`, `licenses`, `profiles`
3. Click each one to verify columns exist

### 1.4 Enable GitHub OAuth
1. Click **"Authentication"** → **"Providers"**
2. Find **GitHub** and toggle it ON
3. Go to [github.com/settings/developers](https://github.com/settings/developers)
4. Click **"New OAuth App"**
   - **Application name:** `PersonalJARVIS`
   - **Homepage URL:** `https://app.letjarvis.com`
   - **Authorization callback URL:** `https://<your-supabase-id>.supabase.co/auth/v1/callback`
5. Click **"Register application"**
6. Copy **Client ID** and **Client Secret**
7. Paste them into Supabase GitHub provider settings
8. Click **"Save"**

### 1.5 Collect Env Vars
1. Click **"Settings"** → **"API"**
2. Copy these values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> ⚠️ The service role key has FULL access. Never expose it in frontend code.

---

## Step 2: LemonSqueezy (Payments)

### 2.1 Create Store
1. Go to **[app.lemonsqueezy.com](https://app.lemonsqueezy.com)**
2. Create account and set up your store
3. Go to **"Stores"** and note your store name

### 2.2 Create Product
1. Click **"Products"** → **"+ New Product"**
2. **Name:** `PersonalJARVIS Productivity`
3. **Pricing:** `$20.00` → **Subscription** → **Monthly**
4. **Description:** Write a brief description
5. Click **"Publish"**
6. Click into the product → **"Variants"** → copy the **Variant ID**

### 2.3 Configure Webhook
1. Go to **"Settings"** → **"Webhooks"**
2. Click **"+"** to add a webhook
3. **URL:** `https://app.letjarvis.com/api/webhook/lemonsqueezy`
4. **Secret:** Generate a random string (save it!)
5. **Events:** Check ALL subscription events:
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_resumed`
   - `subscription_expired`
   - `subscription_paused`
   - `subscription_unpaused`
   - `subscription_payment_failed`
   - `subscription_payment_success`
   - `subscription_payment_recovered`
6. Click **"Save"**

### 2.4 Get API Key
1. Go to **"Settings"** → **"API"**
2. Create a new API key
3. Copy it

```env
LEMONSQUEEZY_API_KEY=your_api_key
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
LEMONSQUEEZY_STORE_ID=your_store_id
LEMONSQUEEZY_VARIANT_ID=your_variant_id
```

---

## Step 3: Dashboard (Vercel)

### 3.1 Push to GitHub
```bash
git add -A
git commit -m "launch ready"
git push origin main
```

### 3.2 Deploy on Vercel
1. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub
2. Click **"Import Project"**
3. Select the **JARVIS-OS** repository
4. **Root Directory:** Click "Edit" and type `dashboard`
5. **Framework Preset:** Next.js (should auto-detect)
6. Click **"Environment Variables"** and add each one:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | from Step 1.5 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Step 1.5 |
| `SUPABASE_SERVICE_ROLE_KEY` | from Step 1.5 |
| `NEXT_PUBLIC_APP_URL` | `https://app.letjarvis.com` |
| `LEMONSQUEEZY_API_KEY` | from Step 2.4 |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | from Step 2.4 |
| `LEMONSQUEEZY_STORE_ID` | from Step 2.4 |
| `LEMONSQUEEZY_VARIANT_ID` | from Step 2.4 |

7. Click **"Deploy"** — wait 2-3 minutes

### 3.3 Custom Domain
1. In Vercel project settings → **"Domains"**
2. Add: `app.letjarvis.com`
3. Follow DNS instructions (add CNAME or A record at your domain registrar)
4. Wait for SSL certificate (usually < 5 minutes)

### 3.4 Verify
- [ ] `app.letjarvis.com/login` loads
- [ ] `app.letjarvis.com/signup` loads
- [ ] Can create account with email
- [ ] Can login with GitHub
- [ ] Dashboard loads after login
- [ ] License key generation works
- [ ] Billing page loads

---

## Step 4: Website (Static Hosting — Vercel)

> ⚠️ This is a **second, separate** Vercel project. Don't use the same project as the dashboard.

1. Go to **[vercel.com/new](https://vercel.com/new)**
2. Click **\"Import\"** on the **JARVIS-OS** repository (same repo as dashboard)
3. **Project Name:** `letjarvis-website` (or similar — just for your reference)
4. **Root Directory:** Click **\"Edit\"** → you will see a folder picker showing folders like `JARVIS-OS (root)`, `dashboard`, `memory`, etc.
   - **Do NOT select `JARVIS-OS (root)`** — that's the whole repo
   - **Select `website`** from the list (or type `website` in the text field)
   - This tells Vercel to only build/serve the `website/` folder
5. **Framework Preset:** Select **\"Other\"** (it's a static HTML site, not Next.js)
6. **Build Command:** Leave empty (no build step needed — it's plain HTML)
7. **Output Directory:** Leave as `.` (default)
8. Click **\"Deploy\"**

### 4.1 Custom Domain
1. Once deployed, go to **Project Settings** → **"Domains"**
2. Add: `letjarvis.com`
3. Also add: `www.letjarvis.com` (redirect to `letjarvis.com`)
4. **DNS Setup** at your domain registrar:
   - Add a **CNAME** record: `@` → `cname.vercel-dns.com`
   - Add a **CNAME** record: `www` → `cname.vercel-dns.com`
5. Wait for SSL (usually < 5 minutes)

### 4.2 Also Add Dashboard Subdomain
1. Go back to the **first** Vercel project (the dashboard)
2. Go to **Settings** → **"Domains"**
3. Add: `app.letjarvis.com`
4. **DNS Setup:** Add a **CNAME** record: `app` → `cname.vercel-dns.com`

### Verify
- [ ] All 5 pages load (index, features, pricing, about, docs)
- [ ] Mobile responsive
- [ ] All links work
- [ ] Animations load

---

## Step 5: npm Publish

### 5.1 Build
```bash
cd /path/to/JARVIS-OS
npm run build
```

### 5.2 Test Locally
```bash
node dist/cli.js --version
node dist/cli.js --help
```

### 5.3 Publish
```bash
npm login
npm publish
```

### 5.4 Verify
```bash
npm install -g personaljarvis
jarvis --version
jarvis --help
```

---

## Step 6: Smoke Test

Run through the full user journey:

1. Visit `letjarvis.com` → website loads
2. `npm install -g personaljarvis` → installs
3. `jarvis setup` → wizard starts
4. Choose "Create account" → opens dashboard signup
5. Sign up → verify email → login
6. Dashboard shows "Productivity" plan
7. Generate license key → copy
8. Paste key in setup wizard → validates
9. `jarvis` → shows "⚡ Productivity plan active (free)"
10. Ask JARVIS something → responds correctly

---

## Environment Variables Summary

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=https://app.letjarvis.com

# LemonSqueezy
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_VARIANT_ID=...
```
