# Development Workflow Rules - SatTrack

## Branch Strategy

### Main Branches
- **`main`**: Production branch - only merged, tested code
- **`development`**: Development branch - main development line, all features are merged here

### Feature Branches
- **`feature/*`**: All new features are developed on feature branches
- Feature branches are merged into `development`, **NOT** directly into `main`

## Workflow

### 1. Starting New Feature Work

```bash
# Always create a new worktree for feature branch
cd /Users/goran/Projects/radio/satTrack
git worktree add .worktrees/feature-my-feature -b feature/my-feature
cd .worktrees/feature-my-feature

# Install dependencies (if needed)
npm install
```

**Rule**: Never work on features directly in the main directory. Always use worktrees.

### 2. Development Workflow

```
feature/my-feature → development → main
```

**Steps:**
1. **Development**: Work on `feature/my-feature` branch in worktree
2. **Merge to development**: When feature is complete, merge into `development`:
   ```bash
   # In feature worktree
   git checkout development
   git merge feature/my-feature
   git push origin development
   ```
3. **Testing**: Test on `development` branch
4. **Merge to main**: When everything is tested and ready for production:
   ```bash
   # In main directory (development branch)
   git checkout main
   git merge development
   git push origin main
   ```

### 3. Automatic Tagging on Main

**When pushing to `main` branch:**
- ✅ GitHub Actions automatically creates a new tag (semantic versioning: v1.0.X)
- ✅ Tag is automatically pushed to GitHub
- ✅ GitHub Release is automatically created with the tag

**Workflow file**: `.github/workflows/auto-tag-release.yml`

**Rule**: Tags are created only on push to `main` branch. Development branch does not create tags.

### 4. Automatic Vercel Deployment

**Vercel configuration:**
- ✅ Vercel automatically deploys every push to `main` branch
- ✅ Build command: `npm run build`
- ✅ Output directory: `.output/public`
- ✅ Framework: Nuxt.js (auto-detected)

**Vercel config**: `vercel.json`

**Rule**: Production deployment happens automatically when merging into `main`.

## Worktree Structure

```
/Users/goran/Projects/radio/satTrack/              [development branch]
├── .worktrees/
│   ├── main/                                      [main branch]
│   └── feature-*/                                  [feature branches]
```

**Rule**: 
- Main directory is always on `development` branch
- `main` branch is in worktree (`.worktrees/main`)
- Feature branches are in worktrees (`.worktrees/feature-*`)

## Commit Message Conventions

Use conventional commit messages:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Refactoring
- `test:` - Tests
- `chore:` - Maintenance

Example:
```
feat: Add satellite pass prediction
fix: Resolve azimuth calculation bug
docs: Update API documentation
```

## Pull Request Workflow

1. **Feature → Development PR**:
   - Create PR from `feature/my-feature` to `development`
   - Review and merge
   - Feature branch can be deleted after merge

2. **Development → Main PR** (Production Release):
   - Create PR from `development` to `main`
   - Final review
   - Merge triggers:
     - ✅ Auto-tag creation
     - ✅ Vercel deployment

## Important Rules

### ✅ DO:
- Always create feature branches from `development`
- Merge feature branches into `development` first
- Test on `development` before merging to `main`
- Use worktrees for feature branches
- Use conventional commit message format

### ❌ DON'T:
- Don't merge directly into `main` from feature branch
- Don't push directly to `main` without merging from `development`
- Don't work on features in the main directory
- Don't skip `development` branch

## Quick Reference

```bash
# Create new feature branch in worktree
git worktree add .worktrees/feature-name -b feature/name

# Merge feature into development
cd .worktrees/feature-name
git checkout development
git merge feature/name
git push origin development

# Merge development into main (production release)
cd /Users/goran/Projects/radio/satTrack  # main directory (development)
git checkout main
git merge development
git push origin main  # Triggers auto-tag and Vercel deploy

# Remove feature worktree after merge
git worktree remove .worktrees/feature-name
```

## Troubleshooting

### Tag is not created
- Check if push is to `main` branch
- Check GitHub Actions logs
- Check if workflow file exists: `.github/workflows/auto-tag-release.yml`

### Vercel is not deploying
- Check Vercel dashboard → Deployments
- Check if `main` branch is connected to Vercel project
- Check build logs in Vercel dashboard

### Worktree issues
- Check if `.worktrees/` is in `.gitignore`
- Check `git worktree list` for all worktrees
- Remove worktree: `git worktree remove .worktrees/name`
