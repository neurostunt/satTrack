# Deployment Guide - SatTrack

## Quick Start - Automatic Deployment (Recommended)

**To enable automatic deployment on every push to main:**

1. Go to Vercel Dashboard → Your Project → Settings → Git
2. Scroll to "Ignored Build Step"
3. Select **"Automatic"** (or leave it empty/default)
4. Save changes

That's it! Every push to `main` will now automatically deploy to Vercel.

---

## Deploy to Vercel (FREE)

### Initial Setup

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

5. **Configure Build Settings**:
   
   **Step 1: Align Project Settings with Production Overrides**
   - Go to Project Settings → General (or Build & Development Settings)
   - **Root Directory:** Leave **completely empty** - your code is in the root of the repository
     - ⚠️ **Important:** Do NOT use `.` or `./` - Vercel will show an error
     - Empty field means root directory of the repository
   - You'll see a warning if Production Overrides differ from Project Settings
   - For each setting, enable "Override" toggle and set:
     - **Build Command:** `npm run build` (Override: ON)
     - **Output Directory:** `.output/public` (Override: ON)
     - **Install Command:** `npm install` (Override: ON)
     - **Development Command:** `npm run dev` (Override: ON)
   - This matches your `vercel.json` configuration and removes the warning
   
   **Step 2: Enable Automatic Deployments (Default)**
   - Go to Project Settings → Git
   - Scroll down to "Ignored Build Step"
   - Select "Automatic" - this will deploy on every push to main branch
   - **OR** leave it empty/default - Vercel will automatically deploy on every push
   - This is the simplest setup - every push to main will trigger a deployment
   
   **Note about Production Overrides:**
   - You may see a warning that "Production Overrides" differ from "Project Settings"
   - Production Overrides cannot be edited directly - they reflect the current production deployment
   - They will automatically update to match Project Settings on your next deployment
   - The warning will disappear after you deploy
   - This is normal and not a problem - just ensure Project Settings are correct

6. **You're all set!** 🎉
   - Every push to `main` branch will automatically deploy to Vercel
   - Your domain will be automatically connected to the latest deployment

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
- Verify Node.js version (check `.nvmrc` - should be Node 24.x)
- Ensure `package.json` has `engines.node` set to `>=24.0.0 <25.0.0`

### API routes not working
- Vercel automatically handles `server/api/*` as serverless functions
- Check function logs in Vercel dashboard

### Environment variables not working
- Make sure they're set in Vercel project settings
- Redeploy after adding new variables

