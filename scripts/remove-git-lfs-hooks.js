#!/usr/bin/env node

/**
 * Remove Git LFS hooks if Git LFS is not being used
 * This script removes pre-push and post-commit hooks that check for git-lfs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const hooksDir = path.join(__dirname, '..', '.git', 'hooks');
const hooksToRemove = ['pre-push', 'post-commit'];

console.log('\n🔧 Removing Git LFS hooks...\n');

let removedCount = 0;

hooksToRemove.forEach(hook => {
  const hookPath = path.join(hooksDir, hook);
  
  if (fs.existsSync(hookPath)) {
    try {
      // Check if it's a Git LFS hook
      const content = fs.readFileSync(hookPath, 'utf-8');
      if (content.includes('git-lfs') || content.includes('git lfs')) {
        fs.unlinkSync(hookPath);
        console.log(`✅ Removed: ${hook}`);
        removedCount++;
      } else {
        console.log(`⚠️  Skipped: ${hook} (not a Git LFS hook)`);
      }
    } catch (error) {
      console.error(`❌ Error removing ${hook}:`, error.message);
    }
  } else {
    console.log(`ℹ️  ${hook} does not exist`);
  }
});

if (removedCount > 0) {
  console.log(`\n✅ Successfully removed ${removedCount} Git LFS hook(s)`);
  console.log('   You can now push without --no-verify flag\n');
} else {
  console.log('\nℹ️  No Git LFS hooks found to remove\n');
}
