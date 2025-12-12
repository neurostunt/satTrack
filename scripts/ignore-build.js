#!/usr/bin/env node

/**
 * Ignored Build Step script for Vercel
 * 
 * This script prevents Vercel from automatically deploying on every push to main.
 * Deployments will only happen via GitHub Actions when tags are pushed.
 * 
 * Exit codes:
 * - 0 = Skip build (don't deploy)
 * - 1 = Build needed (deploy)
 * 
 * Usage in Vercel:
 * Set "Ignored Build Step" command to: node scripts/ignore-build.js
 */

// Always skip Vercel's automatic builds
// GitHub Actions will handle deployments when tags are pushed
process.exit(0);
