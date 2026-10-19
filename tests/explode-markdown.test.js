const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('the published home preserves guide metadata and uses page links instead of source-only anchors', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'architecture-guide-'));
  try {
    fs.mkdirSync(path.join(root, 'scripts'));
    fs.copyFileSync(path.join(__dirname, '../scripts/explode-markdown.js'), path.join(root, 'scripts/explode-markdown.js'));
    fs.writeFileSync(path.join(root, 'GUIDE.md'), `# Example Architecture

**Last Updated**: 2026-10-19

## About This Guide

The guide owns the reference stack.

## Table of Contents

1. [Runtime Contracts](#runtime-contracts)

---

## Runtime Contracts

Portable roots exclude provider acquisition.
`);
    execFileSync(process.execPath, [path.join(root, 'scripts/explode-markdown.js')]);
    const home = fs.readFileSync(path.join(root, 'docs/index.md'), 'utf8');
    assert.match(home, /\*\*Last Updated\*\*: 2026-10-19/);
    assert.match(home, /^# Example Architecture/m);
    assert.match(home, /The guide owns the reference stack\./);
    assert.match(home, /\[Runtime Contracts\]\(runtime-contracts.md\)/);
    assert.doesNotMatch(home, /2025-12-09|\(#runtime-contracts\)/);
    const about = fs.readFileSync(path.join(root, 'docs/about-this-guide.md'), 'utf8');
    assert.doesNotMatch(about, /Table of Contents|\(#runtime-contracts\)/);
    const runtime = fs.readFileSync(path.join(root, 'docs/runtime-contracts.md'), 'utf8');
    assert.match(runtime, /Portable roots exclude provider acquisition\./);
    assert.match(runtime, /\[About This Guide\]\(about-this-guide.md\)/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
