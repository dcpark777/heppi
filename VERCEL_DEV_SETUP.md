# Set up Vercel dev environment using a dev branch

Follow these steps to get a dedicated **dev** deployment on Vercel (separate from production).

---

## 1. Create and push the `dev` branch

```bash
git checkout -b dev
git push -u origin dev
```

---

## 2. Set Preview environment variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com) → your project → **Settings** → **Environment Variables**.
2. Add each variable below. When adding, select **Preview** (and **Development** if you use `vercel dev`). Do **not** select Production.

| Variable | Example value |
|----------|----------------|
| `VITE_ENVIRONMENT` | `dev` |
| `VITE_S3_BUCKET_NAME` | `sydplove-bingo-card-dev` |
| `VITE_AWS_REGION` | `us-east-1` |
| `VITE_SITE_PASSWORD` | *(your dev/staging password)* |
| `VITE_API_BASE` | *(leave empty for same-origin)* |

---

## 3. Deploy the dev branch

- Every push to `dev` triggers a Preview deployment.
- In the project **Deployments** tab, open the latest deployment to get the dev URL (e.g. `heppi-git-dev-<team>.vercel.app`).

---

## 4. (Optional) Give dev a stable URL

1. **Settings** → **Domains** → **Add**.
2. Enter a domain (e.g. `dev.yoursite.com`).
3. Assign it to the **dev** branch so that branch always uses that URL.

---

## 5. Confirm production branch

- **Settings** → **Git** → **Production Branch** should be `main`.
- Then only `main` uses Production env vars and the production domain; `dev` uses Preview env vars and the dev URL.

---

## Summary

| Branch  | Environment | Env vars in Vercel |
|---------|-------------|---------------------|
| `dev`   | Dev (preview) | Set for **Preview** |
| `main`  | Production  | Set for **Production** |

Push to `dev` to deploy to dev; push to `main` to deploy to production.
