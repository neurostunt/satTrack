# Contributing to SatTrack

Thank you for your interest in contributing to SatTrack! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/satTrack.git
   cd satTrack
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Branching Strategy

- **`main`** - Production branch (protected, auto-deploys)
- **`development`** - Development branch (default for new features)

**Workflow:**
1. Create a feature branch from `development`
2. Make your changes
3. Test thoroughly
4. Submit a Pull Request to `development`

## 📝 Code Style

### TypeScript
- Use TypeScript for all new code
- Prefer interfaces over types
- Avoid `any` - use `unknown` if type is unclear
- Use strict mode

### Vue/Nuxt
- Use Composition API with `<script setup>`
- Prefer composables over mixins
- Use kebab-case for component files
- Use camelCase for composables

### Code Formatting
- Run `npm run lint` before committing
- Follow existing code style
- Use meaningful variable names

## 🧪 Testing

Before submitting a PR:
- [ ] Test on desktop browser
- [ ] Test on mobile device (or use dev:ngrok)
- [ ] Check PWA functionality
- [ ] Verify offline mode works
- [ ] Test with different API configurations

## 📋 Pull Request Process

1. **Update your branch**:
   ```bash
   git checkout development
   git pull origin development
   git checkout your-feature-branch
   git rebase development
   ```

2. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: Add new feature"
   ```

3. **Push to your fork**:
   ```bash
   git push origin your-feature-branch
   ```

4. **Create Pull Request**:
   - Go to GitHub
   - Create PR from your branch to `development`
   - Fill out the PR template
   - Wait for review

### Commit Message Format

Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Example:
```
feat: Add satellite search functionality
fix: Resolve pass prediction timezone issue
docs: Update README with API setup instructions
```

## 🐛 Reporting Bugs

Use the GitHub Issues template and include:
- **Description** - Clear description of the bug
- **Steps to reproduce** - How to trigger the bug
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Environment** - Browser, OS, device info
- **Screenshots** - If applicable

## 💡 Feature Requests

For new features:
- Check if it's already requested
- Describe the use case
- Explain why it would be useful
- Consider implementation complexity

## 📚 Documentation

- Update README.md if adding new features
- Add JSDoc comments for new functions
- Update CHANGELOG.md for user-facing changes

## ✅ Checklist

Before submitting:
- [ ] Code follows style guidelines
- [ ] Tests pass (if applicable)
- [ ] Documentation updated
- [ ] No console.log statements (except errors)
- [ ] Works offline (if applicable)
- [ ] Mobile responsive (if UI changes)

## 🎯 Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📚 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🌐 Internationalization
- 🧪 Testing

## 📞 Questions?

- Open a GitHub Discussion
- Check existing Issues/PRs
- Review code comments

Thank you for contributing! 🎉
