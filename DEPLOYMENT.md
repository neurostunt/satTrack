# Deployment Guide - SatTrack

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

5. **Disable Auto-Deployments** (Recommended): 
   - Go to Project Settings → Git
   - Disable "Automatic deployments from Git" for the `main` branch
   - This prevents accidental deployments (tag-based deployment via GitHub Actions will still work)

6. **Get Vercel Credentials for GitHub Actions**:
   - Go to Project Settings → General
   - Copy your `Project ID`
   - Go to your [Vercel Account Settings](https://vercel.com/account/tokens)
   - Create a new token (name it "GitHub Actions")
   - Copy the token
   - Go to your Team/Organization Settings → General to get `Team ID` (this is your `VERCEL_ORG_ID`)

## Tag-Based Deployment

Deployments only happen when you push a tag to the `main` branch. This gives you control over when new versions go live.

### Setup GitHub Actions

1. **Add GitHub Secrets**:
   
   **How GitHub Secrets Work:**
   - ✅ Secrets are **encrypted** and stored separately from code
   - ✅ **Never** appear in code or commits
   - ✅ **Never** displayed in logs (GitHub automatically masks them)
   - ✅ Only accessible to GitHub Actions workflows
   - ✅ **Secure** even for public repositories
   
   **How to Add Secrets:**
   
   1. Go to your GitHub repository → **Settings** (top right)
   2. In the left menu: **Secrets and variables** → **Actions**
   3. Click **New repository secret**
   4. Add these three secrets:
   
      - **Name:** `VERCEL_TOKEN`
        - **Value:** Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
        - Click "Create Token"
        - Name: "GitHub Actions"
        - Copy the token and paste here
      
      - **Name:** `VERCEL_ORG_ID`
        - **Value:** This is your **Team ID** in Vercel (they're the same!)
        - Go to Vercel Dashboard → **Settings** → **General**
        - Find "Team ID" (or "Organization ID") and copy it
        - **Note:** Team ID = Organization ID (same thing in Vercel)
        - Alternative: Run `vercel whoami` in terminal, then `vercel orgs ls`
      
      - **Name:** `VERCEL_PROJECT_ID`
        - **Value:** Go to Vercel Project → **Settings** → **General**
        - Find "Project ID" and copy it
   
   5. Click **Add secret** for each one
   
   **⚠️ IMPORTANT:** After adding secrets, they will **never appear** in your code. 
   In the workflow file, you'll only see `${{ secrets.VERCEL_TOKEN }}` - this is a placeholder that GitHub replaces with the actual value only during execution.

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

### GitHub Actions deployment fails
- Verify all three secrets are set correctly (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
- Check that the tag follows the `v*` pattern (e.g., `v1.0.0`)
- Ensure Vercel project is linked to your GitHub repo
- Check GitHub Actions logs (secrets are automatically masked, so you won't see actual values)

### Security FAQ

**Q: Are secrets safe in a public repository?**
A: **YES!** GitHub Secrets are encrypted and never appear in code. Even if someone sees the workflow file, they'll only see `${{ secrets.NAME }}` - not the actual value.

**Q: Can I see secrets in logs?**
A: **NO.** GitHub automatically masks (hides) all secrets in logs. If you accidentally try to print them, you'll see `***` instead of the actual value.

**Q: Who can access secrets?**
A: Only GitHub Actions workflows in your repository. Even other collaborators cannot see the secret values (only that they exist).
