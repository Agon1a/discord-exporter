#!/usr/bin/env node

/**
 * Automated Release Script
 * Usage: node scripts/release.js [version] [--auto] [--github]
 * 
 * Examples:
 *   node scripts/release.js 1.2.0                  # Interactive release
 *   node scripts/release.js 1.2.0 --auto           # Auto-detect & commit
 *   node scripts/release.js 1.2.0 --auto --github  # Also create GitHub release
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

class ReleaseManager {
  constructor(version, autoMode = false, githubMode = false) {
    this.version = version;
    this.autoMode = autoMode;
    this.githubMode = githubMode;
    this.rootDir = path.resolve(__dirname, '..');
    this.manifestPath = path.join(this.rootDir, 'manifest.json');
    this.changelogPath = path.join(this.rootDir, 'CHANGELOG.md');
    this.packagePath = path.join(this.rootDir, 'package.json');
  }

  log(message, type = 'info') {
    const prefix = {
      info: `${colors.blue}ℹ${colors.reset}`,
      success: `${colors.green}✓${colors.reset}`,
      error: `${colors.red}✗${colors.reset}`,
      warn: `${colors.yellow}⚠${colors.reset}`
    };
    console.log(`${prefix[type]} ${message}`);
  }

  run(command, silent = false) {
    try {
      return execSync(command, { cwd: this.rootDir, encoding: 'utf8' });
    } catch (error) {
      if (!silent) {
        this.log(`Command failed: ${command}`, 'error');
        process.exit(1);
      }
      return null;
    }
  }

  validateVersion() {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)$/;
    if (!semverRegex.test(this.version)) {
      this.log(`Invalid version format: ${this.version}. Use MAJOR.MINOR.PATCH`, 'error');
      process.exit(1);
    }
    this.log(`Version: ${colors.green}${this.version}${colors.reset}`);
  }

  validateGitStatus() {
    const status = this.run('git status --porcelain', true);
    if (status && status.trim() !== '') {
      this.log('Uncommitted changes detected:', 'warn');
      console.log(status);
      const answer = this.autoMode ? 'y' : this.prompt('Continue? (y/n): ');
      if (answer.toLowerCase() !== 'y') {
        this.log('Release cancelled', 'error');
        process.exit(1);
      }
    }
  }

  runTests() {
    this.log('Running tests...', 'info');
    this.run('npm run test:all');
    this.log('Tests passed', 'success');
  }

  runLint() {
    this.log('Running linter...', 'info');
    this.run('npm run lint:check');
    this.log('Linting passed', 'success');
  }

  updateManifest() {
    this.log('Updating manifest.json...', 'info');
    const manifest = JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
    const oldVersion = manifest.version;
    manifest.version = this.version;
    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 4) + '\n');
    this.log(`Version updated: ${oldVersion} → ${this.version}`, 'success');
  }

  updatePackageJson() {
    if (!fs.existsSync(this.packagePath)) return;
    this.log('Updating package.json...', 'info');
    const pkg = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
    pkg.version = this.version;
    fs.writeFileSync(this.packagePath, JSON.stringify(pkg, null, 2) + '\n');
  }

  getChangelogEntry() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    
    return `## [${this.version}] - ${date}

### ✨ Added
- New features and improvements

### 🔧 Improved
- Performance and other improvements

### 🐛 Fixed
- Bug fixes

`;
  }

  updateChangelog() {
    this.log('Updating CHANGELOG.md...', 'info');
    const changelog = fs.readFileSync(this.changelogPath, 'utf8');
    const entry = this.getChangelogEntry();
    
    // Insert after first "---"
    const parts = changelog.split('---\n');
    const updated = parts[0] + '---\n' + entry + '\n---\n' + parts.slice(1).join('---\n');
    
    fs.writeFileSync(this.changelogPath, updated);
    this.log('CHANGELOG.md updated', 'success');
  }

  commit() {
    this.log('Creating git commit...', 'info');
    this.run(`git add manifest.json CHANGELOG.md package.json`);
    this.run(`git commit -m "chore: Release v${this.version}"`);
    this.log(`Committed: Release v${this.version}`, 'success');
  }

  createTag() {
    this.log('Creating git tag...', 'info');
    const tagName = `v${this.version}`;
    this.run(`git tag ${tagName}`);
    this.log(`Tag created: ${tagName}`, 'success');
  }

  push() {
    this.log('Pushing to GitHub...', 'info');
    this.run('git push origin main');
    this.run(`git push origin v${this.version}`);
    this.log('Pushed to GitHub', 'success');
  }

  createGitHubRelease() {
    if (!this.githubMode) return;
    
    this.log('Creating GitHub Release...', 'info');
    
    // Extract changelog entry
    const changelog = fs.readFileSync(this.changelogPath, 'utf8');
    const match = changelog.match(new RegExp(`## \\[${this.version}\\].*?(?=## \\[|$)`, 's'));
    const body = match ? match[0].replace(new RegExp(`## \\[${this.version}\\].*?\n`), '') : 'Release notes in CHANGELOG.md';
    
    // Use GitHub CLI if available
    try {
      this.run(`gh release create v${this.version} --title "v${this.version}" --notes "${body.replace(/"/g, '\\"')}"`, true);
      this.log('GitHub Release created', 'success');
    } catch {
      this.log('GitHub CLI not available. Create release manually at:', 'warn');
      console.log(`https://github.com/YOUR_REPO/releases/new?tag=v${this.version}`);
    }
  }

  prompt(question) {
    console.log(question);
    // For non-interactive mode, return default 'y'
    return 'y';
  }

  run() {
    try {
      console.log(`\n${colors.blue}📦 Discord Exporter Release Manager${colors.reset}\n`);
      
      this.validateVersion();
      this.validateGitStatus();
      
      if (!this.autoMode) {
        const answer = this.prompt(`Start release v${this.version}? (y/n): `);
        if (answer.toLowerCase() !== 'y') {
          this.log('Release cancelled', 'error');
          process.exit(1);
        }
      }
      
      this.runTests();
      this.runLint();
      this.updateManifest();
      this.updatePackageJson();
      this.updateChangelog();
      this.commit();
      this.createTag();
      this.push();
      this.createGitHubRelease();
      
      console.log(`\n${colors.green}✓ Release v${this.version} completed successfully!${colors.reset}\n`);
      console.log('Next steps:');
      console.log('1. Check GitHub: https://github.com/Agon1a/discord-exporter/releases');
      console.log('2. Submit to Chrome Web Store');
      console.log('3. Announce on social media\n');
      
    } catch (error) {
      this.log(`Release failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Main
const args = process.argv.slice(2);
const version = args[0];
const autoMode = args.includes('--auto');
const githubMode = args.includes('--github');

if (!version) {
  console.log('Usage: node scripts/release.js <version> [--auto] [--github]');
  console.log('Example: node scripts/release.js 1.2.0 --auto');
  process.exit(1);
}

const manager = new ReleaseManager(version, autoMode, githubMode);
manager.run();
