#!/usr/bin/env node

/**
 * Deployment script for tag-based deployments
 * Usage: npm run deploy -- 1.0.0
 *        npm run deploy -- 1.2.3 "Release message"
 */

const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const path = require('path');

// Get version from command line arguments
const version = process.argv[2];
const releaseMessage = process.argv[3] || `Release version ${version}`;

if (!version) {
  console.error('❌ Error: Version is required');
  console.log('\nUsage:');
  console.log('  npm run deploy -- 1.0.0');
  console.log('  npm run deploy -- 1.2.3 "Custom release message"');
  console.log('\nVersion must follow semantic versioning (e.g., 1.0.0, 1.2.3)');
  process.exit(1);
}

// Validate version format (semantic versioning)
const versionRegex = /^\d+\.\d+\.\d+$/;
if (!versionRegex.test(version)) {
  console.error(`❌ Error: Invalid version format: ${version}`);
  console.log('Version must follow semantic versioning: MAJOR.MINOR.PATCH (e.g., 1.0.0)');
  process.exit(1);
}

const tagName = `v${version}`;

console.log(`\n🚀 Deploying version ${tagName}...\n`);

try {
  // Check if we're on main branch
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  if (currentBranch !== 'main') {
    console.warn(`⚠️  Warning: You're on branch "${currentBranch}", not "main"`);
    console.log('   Deployment will still work, but make sure you want to deploy from this branch\n');
  }

  // Check if there are uncommitted changes
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  if (status.trim()) {
    console.error('❌ Error: You have uncommitted changes');
    console.log('   Please commit or stash your changes before deploying\n');
    process.exit(1);
  }

  // Check if there are unpushed commits
  try {
    const unpushedCommits = execSync('git log origin/main..HEAD --oneline', { encoding: 'utf-8' }).trim();
    if (unpushedCommits) {
      console.log('📤 Pushing commits to main branch...');
      execSync('git push origin main', { stdio: 'inherit' });
      console.log('✅ Commits pushed successfully\n');
    }
  } catch (e) {
    // No remote or no unpushed commits, continue
  }

  // Check if tag already exists
  try {
    execSync(`git rev-parse ${tagName}`, { stdio: 'ignore' });
    console.error(`❌ Error: Tag ${tagName} already exists`);
    console.log('   Delete it first with: git tag -d ' + tagName);
    console.log('   Then push deletion: git push origin :' + tagName + '\n');
    process.exit(1);
  } catch (e) {
    // Tag doesn't exist, which is good
  }

  // Create annotated tag
  console.log(`📝 Creating tag ${tagName}...`);
  execSync(`git tag -a ${tagName} -m "${releaseMessage}"`, { stdio: 'inherit' });

  // Push tag to remote
  console.log(`\n📤 Pushing tag ${tagName} to origin...`);
  execSync(`git push origin ${tagName}`, { stdio: 'inherit' });

  console.log(`\n✅ Success! Tag ${tagName} pushed successfully`);
  console.log(`\n🔍 Check deployment status:`);
  console.log(`   GitHub Actions: https://github.com/YOUR_USERNAME/YOUR_REPO/actions`);
  console.log(`   Vercel Dashboard: https://vercel.com/dashboard\n`);

} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
}
