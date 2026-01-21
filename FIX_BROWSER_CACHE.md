# Fix: "AWS not configured" Error from Browser Cache

## The Problem

You're seeing: `AWS not configured - missing credentials. Check .env file and restart dev server.`

This error is **NOT** in your current code - it's from an **old cached JavaScript bundle** in your browser.

The file `index-B1F8MkZQ.js` is a bundled file that contains old code from before the migration.

## Solution: Clear Browser Cache

### Option 1: Hard Refresh (Easiest)

**Chrome/Edge (Windows):**
- Press `Ctrl + Shift + R`
- Or `Ctrl + F5`

**Chrome/Edge (Mac):**
- Press `Cmd + Shift + R`

**Firefox (Windows):**
- Press `Ctrl + F5`
- Or `Ctrl + Shift + R`

**Firefox (Mac):**
- Press `Cmd + Shift + R`

**Safari (Mac):**
- Press `Cmd + Option + R`

### Option 2: Clear Cache via DevTools

1. Open DevTools (`F12` or `Cmd+Option+I`)
2. Go to **Network** tab
3. Check **"Disable cache"** checkbox
4. Keep DevTools open
5. Reload the page (`F5` or `Cmd+R`)

### Option 3: Clear Browser Cache Completely

**Chrome:**
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cached images and files"
3. Time range: "All time"
4. Click "Clear data"

**Firefox:**
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cache"
3. Time range: "Everything"
4. Click "Clear Now"

**Safari:**
1. Safari menu → Preferences → Advanced
2. Check "Show Develop menu"
3. Develop menu → Empty Caches

### Option 4: Incognito/Private Window

Open your site in an incognito/private window:
- **Chrome**: `Ctrl+Shift+N` (Windows) or `Cmd+Shift+N` (Mac)
- **Firefox**: `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
- **Safari**: `Cmd+Shift+N`

This will load fresh JavaScript without cache.

## Verify It's Fixed

After clearing cache, check:

1. **Open DevTools → Console**
   - Should NOT see "AWS not configured" message
   - Should NOT see errors about missing credentials

2. **Open DevTools → Network**
   - Reload page
   - Look for `/api/load-card` request
   - Should return 200 status (not 404 or 500)

3. **Check the JavaScript file**
   - In Network tab, find `index-*.js` file
   - Click on it → Response tab
   - Search for "AWS not configured"
   - Should NOT find it (if you do, cache is still there)

## Why This Happens

When you deploy new code:
1. Vercel builds new JavaScript bundles with new filenames (e.g., `index-ABC123.js`)
2. Your browser still has old bundles cached (e.g., `index-B1F8MkZQ.js`)
3. Browser loads old cached file instead of new one
4. Old file has old code that checks for AWS credentials

## Prevention

To avoid this in the future:
- Use hard refresh (`Cmd+Shift+R`) after deployments
- Or use DevTools with "Disable cache" checked during development

## Still Seeing the Error?

If you still see the error after clearing cache:

1. **Check Vercel Deployment**
   - Go to Vercel Dashboard → Deployments
   - Make sure latest deployment is successful
   - Check build logs for errors

2. **Check File Names**
   - In Network tab, check what `index-*.js` file is loading
   - If it's still `index-B1F8MkZQ.js`, cache wasn't cleared
   - Try a different browser or incognito mode

3. **Check CDN Cache**
   - Vercel uses a CDN that might cache files
   - Wait a few minutes and try again
   - Or redeploy to force CDN refresh

## Quick Test

After clearing cache, open browser console and run:

```javascript
fetch('/api/load-card?cardId=test')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**Expected**: `{ success: true, tiles: [...] }`  
**If error**: Check the error message - might be a different issue (environment variables, etc.)

---

**TL;DR**: Hard refresh your browser (`Cmd+Shift+R` or `Ctrl+Shift+R`) - the error is from old cached JavaScript!

