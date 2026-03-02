# Deployment Guide — SatTrack

Vercel **does not auto-deploy on every push**. All deployments are explicit and controlled via npm scripts or GitHub Actions.

---

## Initial Setup

### 1. Install Vercel CLI and link project

```bash
npm install -g vercel
vercel login
cd /path/to/satTrack/development
vercel link       # link to existing Vercel project
```

### 2. Get project IDs

```bash
cat .vercel/project.json
# → { "orgId": "...", "projectId": "..." }
```

### 3. Create Vercel token

Go to **[vercel.com/account/tokens](https://vercel.com/account/tokens)** → Create → Full Account scope.

### 4. Set GitHub Secrets

```bash
gh secret set VERCEL_TOKEN       # Vercel personal access token
gh secret set VERCEL_ORG_ID      # orgId from project.json
gh secret set VERCEL_PROJECT_ID  # projectId from project.json
```

Verify:
```bash
gh secret list
```

### 5. Set environment variables in Vercel

In **Vercel Dashboard → Project → Settings → Environment Variables**, add:

| Variable | Environment | Required |
|---|---|---|
| `N2YO_API_KEY` | Production + Preview | Yes |
| `SPACE_TRACK_USERNAME` | Production + Preview | Optional |
| `SPACE_TRACK_PASSWORD` | Production + Preview | Optional |
| `SATNOGS_API_TOKEN` | Production + Preview | Optional |

---

## Deploy Commands

### Production release

```bash
npm run production
```

Interactive — prompts for release type and version bump:

```
Current version: v1.0.4

Release type:
  1) Production release
  2) Hotfix

Version bump:
  1) Patch  — bug fixes            v1.0.5
  2) Minor  — new features         v1.1.0
  3) Major  — breaking changes     v2.0.0

Tag to create: v1.0.5
Confirm? [y/N]: y
```

What happens after confirming:
1. Tag created + pushed to GitHub
2. **GitHub Actions** (`production-release.yml`) triggers:
   - Merges tag into `main`
   - Runs `vercel deploy --prod` (Vercel builds on its servers)
   - Creates GitHub Release with changelog
   - Opens + auto-closes a release ticket in GitHub Issues

### Beta / preview deploy

```bash
npm run beta                        # deploys development branch
npm run beta -- feature/my-branch  # deploys any branch
```

Triggers `beta-deploy.yml` via `gh` CLI — deploys to a Vercel preview URL. No tag, no merge to main.

### Preview changelog (no deploy)

```bash
npm run release:preview
```

Shows what the next release notes will look like.

### Check deployment status

```bash
npm run status
```

Lists recent production deployments from Vercel.

---

## Rollback

```bash
npm run rollback
```

Lists recent production deployments, prompts for selection, then instantly aliases that deployment to production (no rebuild needed).

---

## GitHub Actions Workflows

### `production-release.yml`

Trigger: `git push origin v1.0.5` (any `v*` tag)

Steps:
1. Merge tag into `main`
2. `vercel deploy --prod` (Vercel builds on its servers, reads `vercel.json`)
3. Generate changelog
4. Create GitHub Release
5. Create + close release ticket in Issues

### `beta-deploy.yml`

Trigger: `workflow_dispatch` (manual, via `npm run beta` or GitHub UI)

Steps:
1. Checkout selected branch
2. `vercel deploy` → outputs preview URL

---

## Vercel Project Settings

`vercel.json` is committed and contains:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".output/public",
  "framework": "nuxtjs",
  "github": { "enabled": false },
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- `"github": { "enabled": false }` — disables Vercel's native GitHub integration, all deployments go through GitHub Actions only
- `"outputDirectory": ".output/public"` — required for Nuxt SPA (`ssr: false`) output
- `"rewrites"` — SPA fallback routing, required for client-side navigation

---

## Troubleshooting

**Build fails in GitHub Actions**
- Check `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets are set
- Run `gh secret list` to verify

**`npm run beta` fails**
- Check that `gh` CLI is installed and authenticated: `gh auth status`

**Rollback not working**
- Verify `vercel` CLI is installed: `npm install -g vercel`
- Run `vercel whoami` to confirm you're logged in

**Environment variables not working after deploy**
- Add variables in Vercel Dashboard → Settings → Environment Variables
- Redeploy to apply

**Node version mismatch**
- Check `.nvmrc` — project requires Node 24
- Vercel respects `.nvmrc` automatically
