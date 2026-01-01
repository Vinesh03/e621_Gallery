#!/usr/bin/env node
/**
 * Post-sync script to fix Gradle 9.0 deprecation warnings
 * Removes flatDir usage from capacitor-cordova-android-plugins
 * 
 * Usage: node scripts/fix-gradle-flatdir.js
 * Or run: npm run cap:sync (which runs this automatically)
 */

const fs = require('fs');
const path = require('path');

const buildGradlePath = path.join(
  __dirname,
  '..',
  'android',
  'capacitor-cordova-android-plugins',
  'build.gradle'
);

function fixFlatDir() {
  if (!fs.existsSync(buildGradlePath)) {
    console.log('⚠️  capacitor-cordova-android-plugins/build.gradle not found, skipping...');
    return;
  }

  let content = fs.readFileSync(buildGradlePath, 'utf8');
  const originalContent = content;

  // Remove flatDir blocks
  content = content.replace(/repositories\s*\{\s*flatDir\s*\{[^}]*\}\s*\}/g, '');
  content = content.replace(/flatDir\s*\{[^}]*\}/g, '');

  // Clean up empty repositories blocks
  content = content.replace(/repositories\s*\{\s*\}/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(buildGradlePath, content, 'utf8');
    console.log('✅ Fixed flatDir deprecation in capacitor-cordova-android-plugins/build.gradle');
  } else {
    console.log('ℹ️  No flatDir found, nothing to fix');
  }
}

try {
  fixFlatDir();
} catch (error) {
  console.error('❌ Error fixing flatDir:', error.message);
  process.exit(1);
}
