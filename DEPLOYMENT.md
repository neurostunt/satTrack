# Deployment Guide - SatTrack

## Quick Deploy to Vercel (Recommended - FREE)

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Go to [vercel.com](https://vercel.com)** and sign up/login (free)

3. **Import your GitHub repository**:
   - Click "Add New Project"
   - Select your `satTrack` repository
   - Vercel will auto-detect Nuxt 4

4. **Configure Environment Variables**:
   In the Vercel project settings, add these environment variables:
   - `N2YO_API_KEY` - Your n2yo API key
   - `SATNOGS_API_TOKEN` - Your SatNOGS API token
   - `SPACE_TRACK_USERNAME` - Your Space-Track username
   - `SPACE_TRACK_PASSWORD` - Your Space-Track password
   - `N2YO_BASE_URL` (optional, defaults to https://api.n2yo.com/rest/v1/satellite)
   - `SPACE_TRACK_BASE_URL` (optional, defaults to https://www.space-track.org)
   - `SATNOGS_BASE_URL` (optional, defaults to https://db.satnogs.org/api)

5. **Disable Auto-Deployments** (Optional but Recommended): 
   - Go to Project Settings → Git
   - You can disable "Automatic deployments from Git" for the `main` branch
   - This prevents accidental deployments (tag-based deployment via GitHub Actions will still work)

6. **Get Vercel Credentials for GitHub Actions**:
   - Go to Project Settings → General
   - Copy your `Project ID`
   - Go to your [Vercel Account Settings](https://vercel.com/account/tokens)
   - Create a new token (name it "GitHub Actions")
   - Copy the token
   - Go to your Organization settings to get `Organization ID`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Set environment variables**:
   ```bash
   vercel env add N2YO_API_KEY
   vercel env add SATNOGS_API_TOKEN
   vercel env add SPACE_TRACK_USERNAME
   vercel env add SPACE_TRACK_PASSWORD
   ```

5. **Deploy to production**:
   ```bash
   vercel --prod
   ```

## Tag-Based Deployment (Recommended)

Deployments only happen when you push a tag to the `main` branch. This gives you control over when new versions go live.

### Setup GitHub Actions

1. **Add GitHub Secrets**:
   Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret
   
   Add these secrets:
   - `VERCEL_TOKEN` - Your Vercel token (from Account Settings → Tokens)
   - `VERCEL_ORG_ID` - Your Vercel Organization ID (from Organization settings)
   - `VERCEL_PROJECT_ID` - Your Vercel Project ID (from Project Settings → General)

2. **How to Deploy**:

   **Option A: Using npm script (Recommended)**:
   ```bash
   # Make your changes and commit
   git add .
   git commit -m "Your changes"
   git push origin main
   
   # Deploy using npm script
   npm run deploy -- 1.0.0
   # Or with custom message
   npm run deploy -- 1.2.3 "Fixed satellite tracking bug"
   ```

   **Option B: Manual git commands**:
   ```bash
   # Make your changes and commit
   git add .
   git commit -m "Your changes"
   git push origin main
   
   # Create and push a tag to trigger deployment
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

3. **Tag Naming Convention**:
   - Use semantic versioning: `v1.0.0`, `v1.2.3`, `v2.0.0`
   - Tags must start with `v` (e.g., `v1.0.0`)
   - The workflow will automatically deploy when you push the tag

4. **Check Deployment Status**:
   - Go to your GitHub repository → Actions tab
   - You'll see the "Deploy to Vercel" workflow running
   - Once complete, your app will be live on Vercel

### Benefits of Tag-Based Deployment

- ✅ Control when deployments happen
- ✅ Only deploy stable, tested versions
- ✅ Clear version history
- ✅ Easy rollback (just deploy a previous tag)
- ✅ No accidental deployments from WIP commits

## Alternative: Deploy to Netlify (Also FREE)

1. **Push to GitHub** (same as above)

2. **Go to [netlify.com](https://netlify.com)** and sign up/login

3. **Import from Git**:
   - Click "Add new site" → "Import an existing project"
   - Connect GitHub and select your repo

4. **Build settings** (auto-detected, but verify):
   - Build command: `npm run build`
   - Publish directory: `.output/public`

5. **Add environment variables** in Site settings → Environment variables

6. **Deploy**: Click "Deploy site"

## Vercel Free Tier Limits

- ✅ 100GB bandwidth/month
- ✅ Unlimited serverless function invocations
- ✅ Automatic HTTPS
- ✅ Custom domains (free)
- ✅ Preview deployments for every PR
- ✅ No credit card required

Perfect for non-profit/ham radio projects!

## Troubleshooting

### Build fails
- Check that all dependencies are in `package.json`
- Verify Node.js version (check `.nvmrc` if present)

### API routes not working
- Vercel automatically handles `server/api/*` as serverless functions
- Check function logs in Vercel dashboard

### Environment variables not working
- Make sure they're set in Vercel project settings
- Redeploy after adding new variables

### GitHub Actions deployment fails
- Verify all three secrets are set correctly (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
- Check that the tag follows the `v*` pattern (e.g., `v1.0.0`)
- Ensure Vercel project is linked to your GitHub repo

## Cost Comparison

| Platform | Cost | Best For |
|----------|------|----------|
| **Vercel** | FREE | Nuxt apps, best DX |
| **Netlify** | FREE | Static + functions |
| **Cloudflare Pages** | FREE | Static only (needs Workers for APIs) |
| **Render** | FREE* | Full-stack (spins down) |

*Render free tier spins down after 15min inactivity (cold starts)

## Recommended: Vercel

Vercel is the best choice because:
- ✅ Built by Nuxt creators (same team)
- ✅ Zero configuration needed
- ✅ Best performance
- ✅ Free custom domain
- ✅ Automatic deployments
- ✅ Perfect for non-profit projects
