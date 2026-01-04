# Deployment Guide - Vercel

This guide explains how to deploy the Heppi application to Vercel with a custom domain.

## Prerequisites

1. A GitHub account with your code pushed to a repository
2. A Vercel account (free tier is fine)
3. Your domain `sydplove.com` configured in Route53

## Deployment Steps

### 1. Deploy to Vercel

**Option A: Via Vercel Dashboard (Recommended)**
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "Add New Project"
3. Import your GitHub repository (`dcpark777/heppi`)
4. Vercel will auto-detect it's a Vite project
5. Click "Deploy"
6. Wait for deployment to complete (usually 1-2 minutes)

**Option B: Via Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow the prompts
```

### 2. Configure Custom Domain

1. In Vercel dashboard, go to your project
2. Go to **Settings** → **Domains**
3. Click **Add Domain**
4. Enter `sydplove.com` (apex domain)
5. Vercel will show you DNS instructions

**Note**: If you previously had `heppi.sydplove.com` configured, you can either:
- Remove it from Vercel (optional, but recommended to avoid confusion)
- Keep it as an additional domain if you want both to work

### 3. Update Route53 DNS

For an **apex domain** (root domain like `sydplove.com`), Vercel will provide **A records** with IP addresses (not CNAME, as apex domains cannot use CNAME records).

1. Go to AWS Route53 Console
2. Select your hosted zone for `sydplove.com`
3. Create or update the A record for `sydplove.com`:
   - **Name**: Leave empty or enter `@` (represents the root domain)
   - **Type**: **A**
   - **Routing policy**: Simple routing
   - **Value**: Enter the IP addresses provided by Vercel (usually 2-4 IP addresses)
     - Vercel will show these in the format: `76.76.21.21`, `76.76.21.22`, etc.
     - Add each IP address as a separate value in the A record
   - **TTL**: 300 (or leave default)
   - **Alias**: No (unchecked)

**Important**: 
- Apex domains (root domains) **cannot** use CNAME records per DNS standards
- You must use A records with the IP addresses Vercel provides
- Vercel typically provides 2-4 IP addresses for redundancy

### 4. Wait for DNS Propagation

- DNS changes can take a few minutes to propagate
- Vercel will automatically provision an SSL certificate once DNS is verified
- You can check status in Vercel dashboard under **Domains**

### 5. Verify Deployment

Once DNS propagates (usually 5-15 minutes):
- Visit `https://sydplove.com` (HTTPS is automatic!)
- You should see your Christmas tree and fireworks animation

## Automatic Deployments

Vercel automatically deploys when you push to your main branch:
- Push to `main` → Automatic deployment
- Each deployment gets a unique URL for preview
- Production domain always points to latest successful deployment

## Environment Variables (if needed later)

If you need to add environment variables (e.g., Supabase keys):
1. Go to **Settings** → **Environment Variables**
2. Add your variables
3. Redeploy (or wait for next auto-deploy)

## Troubleshooting

**Domain not working?**
- Check Route53 DNS records are correct
- Wait a bit longer for DNS propagation (can take up to 48 hours, usually much faster)
- Check Vercel dashboard for domain status/errors

**Build fails?**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Check that `npm run build` works locally

## Cost

- **Vercel Free Tier**: Perfect for this project
  - Unlimited deployments
  - 100GB bandwidth/month
  - Automatic HTTPS
  - Custom domains included

## Benefits Over EC2 Setup

✅ No server management  
✅ Automatic HTTPS/SSL  
✅ Global CDN (fast worldwide)  
✅ Auto-deploy on Git push  
✅ Free tier sufficient  
✅ Much simpler setup  
✅ Better performance (CDN)  

