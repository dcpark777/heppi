# Troubleshooting: "AWS not configured" Error

## The Issue

You're seeing: `AWS not configured - loading from localStorage as fallback`

This message is **not** in the current code, which means either:
1. **Browser cache** - Old JavaScript is still cached
2. **API endpoint failing** - The `/api/load-card` endpoint is returning an error
3. **Deployment issue** - The new code hasn't been deployed yet

## Quick Fixes

### 1. Clear Browser Cache

**Hard refresh** your browser:
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- **Safari**: `Cmd+Option+R`

Or open DevTools → Network tab → Check "Disable cache"

### 2. Check API Endpoint

Open browser DevTools → Network tab → Look for `/api/load-card` request:

**If you see 404:**
- API functions might not be deployed
- Check Vercel deployment logs

**If you see 500:**
- Serverless function is failing
- Check Vercel function logs for errors
- Likely missing environment variables

**If you see CORS error:**
- Vercel should handle CORS automatically
- Check function response headers

### 3. Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project
2. Click **Functions** tab
3. Click on `/api/load-card`
4. Check **Logs** for errors

**Common errors:**
- `AWS_ACCESS_KEY_ID is not defined` → Environment variable not set
- `Cannot find module '@aws-sdk/...'` → Dependencies not installed
- `Table not found` → Wrong table name in environment variable

### 4. Verify Environment Variables

In Vercel Dashboard → Settings → Environment Variables, make sure you have:

✅ `AWS_ACCESS_KEY_ID` (NOT `VITE_AWS_ACCESS_KEY_ID`)
✅ `AWS_SECRET_ACCESS_KEY` (NOT `VITE_AWS_SECRET_ACCESS_KEY`)
✅ `AWS_REGION`
✅ `ENVIRONMENT`
✅ `BINGO_CARD_TABLE`
✅ `BINGO_CHANGES_TABLE`
✅ `S3_BUCKET_NAME`

**Important**: These should be set for **Production**, **Preview**, and **Development**.

### 5. Test API Endpoint Directly

Open browser console and run:

```javascript
fetch('/api/load-card?cardId=test')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**Expected response:**
```json
{
  "success": true,
  "tiles": [[...], [...], ...]
}
```

**If you get an error**, check the error message in the console.

## Most Likely Causes

### 1. Environment Variables Not Set
**Symptom**: API returns 500 error, logs show "AWS_ACCESS_KEY_ID is not defined"

**Fix**: Add environment variables in Vercel dashboard (see step 4 above)

### 2. Wrong Variable Names
**Symptom**: API returns 500, credentials not found

**Fix**: Make sure variables are named:
- `AWS_ACCESS_KEY_ID` (not `VITE_AWS_ACCESS_KEY_ID`)
- `AWS_SECRET_ACCESS_KEY` (not `VITE_AWS_SECRET_ACCESS_KEY`)

### 3. Browser Cache
**Symptom**: Old code still running, old error messages

**Fix**: Hard refresh browser (see step 1)

### 4. API Functions Not Deployed
**Symptom**: 404 error on `/api/load-card`

**Fix**: 
- Check that `api/` directory is in your repository
- Redeploy on Vercel
- Check Vercel build logs

## Debug Steps

1. **Check Network Tab**:
   - Open DevTools → Network
   - Reload page
   - Find `/api/load-card` request
   - Check status code and response

2. **Check Console**:
   - Look for error messages
   - Check if API call is being made
   - See what error is being caught

3. **Check Vercel Logs**:
   - Go to Vercel Dashboard
   - Check function logs
   - Look for errors in serverless functions

4. **Test Locally** (if you have Vercel CLI):
   ```bash
   vercel dev
   ```
   This will run functions locally and show errors

## Expected Behavior

**After fix, you should see:**
- ✅ No "AWS not configured" message
- ✅ API calls succeed (200 status)
- ✅ Data loads from DynamoDB (not localStorage)
- ✅ No console errors

## Still Having Issues?

Check:
1. Vercel deployment status (is it deployed?)
2. Environment variables (are they set correctly?)
3. Browser cache (hard refresh)
4. Network tab (what's the actual error?)

