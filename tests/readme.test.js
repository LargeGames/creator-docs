/* README.md validation tests
   Framework: Node's built-in test runner (node:test) + node:assert/strict
   Run: node --test tests/readme.test.js
*/
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const README_PATH = path.join(ROOT, 'README.md');

test('README exists at repository root', () => {
  assert.ok(fs.existsSync(README_PATH), 'README.md must exist at the repo root');
});

const md = fs.existsSync(README_PATH) ? fs.readFileSync(README_PATH, 'utf8') : '';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMarkdownLinks(markdown) {
  const links = [];
  // Standard markdown links: [text](url "title") - exclude images with negative lookbehind
  const reMdLink = /(?<!\!)\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = reMdLink.exec(markdown)) !== null) {
    links.push({ text: m[1], url: m[2] });
  }
  // Autolinks: <https://example.com>
  const reAuto = /<((?:https?:\/\/)[^>\s]+)>/g;
  while ((m = reAuto.exec(markdown)) !== null) {
    links.push({ text: null, url: m[1] });
  }
  return links;
}

function normalizePathFromLink(url) {
  // Ignore anchors and queries
  const noFrag = url.split('#')[0].split('?')[0];
  // Remove leading ./ or /
  const cleaned = noFrag.replace(/^\.\/+/, '').replace(/^\/+/, '');
  return path.resolve(ROOT, cleaned);
}

test('README has a single H1 title "Roblox Creator Documentation"', () => {
  assert.ok(md.length > 0, 'README.md should be readable');
  const h1Matches = md.match(/^# .+/gm) || [];
  assert.equal(h1Matches.length, 1, 'Exactly one H1 heading is expected');
  assert.ok(/^# Roblox Creator Documentation\s*$/m.test(md), 'H1 must be "Roblox Creator Documentation"');
});

test('README includes key section headings', () => {
  const headings = [
    '## Reporting Issues',
    '## Contribution Guidelines',
    '## Minor Contributions',
    '## Larger Contributions',
    '## Offline Workflow',
    '## Document Types',
    '## Contribution Basics',
    '## Licenses',
    '## Code of Conduct'
  ];
  for (const h of headings) {
    const pattern = new RegExp('^' + escapeRegex(h) + '\\s*$', 'm');
    assert.ok(pattern.test(md), `Missing heading: ${h}`);
  }
});

test('README mentions Engine API reference is read-only', () => {
  assert.ok(/read-only version of the Engine API reference/i.test(md),
    'README should state the Engine API reference is read-only');
});

test('README Licenses section references expected licenses', () => {
  assert.ok(/Creative Commons Attribution 4\.0 International Public License/.test(md),
    'Should reference CC BY 4.0 for prose');
  assert.ok(/MIT License/.test(md),
    'Should reference MIT for code samples');
});

test('Example URL mapping from GitHub to docs is present', () => {
  assert.ok(/https:\/\/github\.com\/Roblox\/creator-docs\/blob\/main\/content\/en-us\/avatar\/index\.md/.test(md),
    'GitHub source example URL should be present');
  assert.ok(/https:\/\/create\.roblox\.com\/docs\/en-us\/avatar/.test(md),
    'Rendered docs example URL should be present');
});

test('All external links use https scheme', () => {
  const links = extractMarkdownLinks(md).filter(l => /^\w+:\/\//.test(l.url));
  for (const l of links) {
    assert.ok(/^https:\/\//i.test(l.url), `External link should use https: ${l.url}`);
  }
  assert.ok(!/http:\/\//i.test(md), 'README should not contain http:// URLs');
});

test('Key relative links resolve to existing files/directories', () => {
  const expected = [
    './CONTRIBUTING.md',
    './LICENSE',
    './LICENSE-CODE',
    './CODE_OF_CONDUCT.md',
    './content/en-us/',
    './content/en-us/tutorials',
    './content/en-us/reference'
  ];
  for (const u of expected) {
    const target = normalizePathFromLink(u);
    assert.ok(fs.existsSync(target), `Expected path to exist: ${u} -> ${target}`);
  }
});

test('All relative markdown links (non-anchors) resolve to existing targets', () => {
  const links = extractMarkdownLinks(md)
    .filter(l => !/^\w+:\/\//.test(l.url))        // not absolute (http/https/mailto/etc.)
    .filter(l => !l.url.startsWith('#'));         // not a pure anchor

  for (const l of links) {
    const target = normalizePathFromLink(l.url);
    assert.ok(fs.existsSync(target), `Broken relative link: ${l.url}`);
  }
});

test('Auto-numbered lists use "1." pattern in steps (sanity check)', () => {
  const count = (md.match(/^\s*1\.\s+/gm) || []).length;
  assert.ok(count >= 5, `Expected at least 5 auto-numbered list items, found ${count}`);
});