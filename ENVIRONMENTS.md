# Environments: Local, Dev, Production

This project uses three environments.

| Environment   | Where it runs        | Branch (Vercel) | Env vars source      |
|---------------|----------------------|-----------------|----------------------|
| **Local**     | Your machine         | —               | `.env.local`         |
| **Dev**       | Vercel (preview)     | `dev` (or any)  | Vercel → Preview     |
| **Production**| Vercel (production)  | `main`          | Vercel → Production  |

---

## 1. Local

- **Run:** `npm run dev`
- **Config:** Copy `.env.example` to `.env.local` and set values for local (e.g. `VITE_ENVIRONMENT=dev`, optional `VITE_API_BASE` if you run API elsewhere).
- **Optional:** Use `vercel dev` to run the app and serverless functions (e.g. `api/`) locally with Vercel’s routing.

---

## 2. Dev (Vercel) — set up using a `dev` branch

### Step-by-step

1. **Create and push the `dev` branch**
   ```bash
   git checkout -b dev
   git push -u origin dev
   ```

2. **Set Preview environment variables in Vercel**
   - Go to [Vercel Dashboard](https://vercel.com) → your project → **Settings** → **Environment Variables**.
   - Add each variable below. When adding, select **Preview** (and **Development** if you use `vercel dev`). Do **not** select Production.
   - Suggested dev values:
     - `VITE_ENVIRONMENT` = `dev`
     - `VITE_S3_BUCKET_NAME` = `sydplove-bingo-card-dev` (or your dev bucket)
     - `VITE_AWS_REGION` = `us-east-1` (or your region)
     - `VITE_SITE_PASSWORD` = your dev/staging password
     - `VITE_API_BASE` = leave empty (same origin) unless you use a separate API URL for dev

3. **Deploy the dev branch**
   - Every push to `dev` will trigger a Preview deployment.
   - After the first deploy, find the URL in the project **Deployments** tab (e.g. `heppi-git-dev-<team>.vercel.app`).

4. **(Optional) Give dev a stable URL**
   - **Settings** → **Domains** → **Add**.
   - Enter a domain (e.g. `dev.yoursite.com`) and assign it to the **dev** branch so that branch always deploys to that domain.

5. **Confirm production branch**
   - **Settings** → **Git** → **Production Branch** should be `main` (or your production branch). That way only `main` uses Production env vars and the production domain; `dev` stays on Preview.

### Summary

- **Purpose:** Staging / integration testing before production.
- **Deploying:** Push to `dev`; each push creates a new Preview deployment.
- **URL:** Preview URL from Deployments, or your custom domain assigned to the `dev` branch.

---

## 3. Production (Vercel)

- **Purpose:** Live site.
- **Setup:**
  1. Same project → **Settings** → **Environment Variables**.
  2. Add the same variables, but choose **Production** only.
  3. Use production values, e.g.:
     - `VITE_ENVIRONMENT=production`
     - `VITE_S3_BUCKET_NAME=sydplove-bingo-card-production`
     - `VITE_SITE_PASSWORD=<strong-production-password>`
- **Deploying:** Push to `main` (or whatever you set as **Production Branch** in **Settings** → **Git**).
- **URL:** Your production domain.

---

## Quick reference

- **Local:** `cp .env.example .env.local` → edit → `npm run dev`
- **Dev:** Set **Preview** env vars in Vercel; push to `dev` (or another branch).
- **Production:** Set **Production** env vars in Vercel; push to `main`.
