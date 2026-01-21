#!/usr/bin/env node

/**
 * Pre-deployment script
 * Generates version.json with semantic version from package.json
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read version from package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version || '0.1.0';

// Get git branch
let branch = 'local';
try {
  branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
} catch (error) {
  console.warn('⚠️  Could not get git branch info');
}

// Get current timestamp
const timestamp = new Date().toISOString();

// Create version info
const versionInfo = {
  version,
  timestamp,
  branch
};

// Write to build directory
const buildDir = path.join(__dirname, '..', 'build');
const versionFile = path.join(buildDir, 'version.json');

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  console.error('❌ Build directory not found! Run "npm run build" first.');
  process.exit(1);
}

// Write version file
fs.writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2));

console.log('✅ Version file created:');
console.log(`   Version: ${version}`);
console.log(`   Branch: ${branch}`);
console.log(`   Timestamp: ${timestamp}`);
