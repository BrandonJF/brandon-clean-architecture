#!/usr/bin/env node

/**
 * Markdown Exploder
 *
 * Takes a large markdown file with H2 sections and explodes it into
 * individual files in a docs/ directory for MkDocs.
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../GUIDE.md');
const OUTPUT_DIR = path.join(__dirname, '../docs');

// Clean and create output directory
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Read source file
const content = fs.readFileSync(INPUT_FILE, 'utf-8');
const lines = content.split('\n');

// Extract title and metadata from the top
let title = 'Brandon\'s Clean Architecture Guide';
let description = '';
let currentSection = null;
let sections = [];
let currentContent = [];
let inFrontMatter = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Extract title from first H1
  if (line.startsWith('# ') && !title) {
    title = line.replace('# ', '').trim();
    continue;
  }

  // Extract description from blockquote
  if (line.startsWith('> ')) {
    description = line.replace('> ', '').trim();
    continue;
  }

  // Skip metadata lines at top
  if (line.startsWith('**Last Updated') ||
      line.startsWith('**Status') ||
      line.startsWith('**Target Audience')) {
    continue;
  }

  // Detect H2 section start
  if (line.startsWith('## ') && !line.includes('Table of Contents')) {
    // Save previous section
    if (currentSection) {
      sections.push({
        title: currentSection,
        content: currentContent.join('\n').trim()
      });
    }

    // Start new section
    currentSection = line.replace('## ', '').trim();
    currentContent = [line]; // Include the H2 header
    continue;
  }

  // Skip horizontal rules between sections
  if (line.trim() === '---' && currentSection === null) {
    continue;
  }

  // Add line to current section
  if (currentSection) {
    currentContent.push(line);
  }
}

// Save last section
if (currentSection) {
  sections.push({
    title: currentSection,
    content: currentContent.join('\n').trim()
  });
}

// Create index.md with introduction
const indexContent = `# ${title}

${description}

**Last Updated**: 2025-12-09
**Author**: Brandon John-Freso
**License**: MIT

---

## About This Guide

This is a comprehensive, opinionated guide to Clean Architecture for TypeScript and Next.js projects. It reflects my personal preferences built over years of building production systems.

### What You'll Learn

- How to structure TypeScript/Next.js projects with Clean Architecture
- Feature-first directory organization (not layer-first)
- Dependency inversion and composition patterns
- Testing strategies with test doubles (not mocking frameworks)
- Next.js integration patterns
- Migration strategies from messy codebases

### Philosophy

**"Always follow clean arch, it's not that much overhead."**

This guide prioritizes:
- Domain isolation
- Developer ergonomics
- Fast tests (<50ms for unit tests)
- Simple, clear vocabulary (no heavy jargon)
- Functional programming bias

### How to Use This Guide

Navigate through the sections in the sidebar. Each section is standalone but builds on previous concepts.

Start with [Philosophy & Core Principles](philosophy-core-principles.md) to understand the why, then move through the architectural layers and patterns.

---

## Quick Navigation

${sections.map(s => `- [${s.title}](${slugify(s.title)}.md)`).join('\n')}
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'index.md'), indexContent);

// Write each section to its own file
sections.forEach(section => {
  const filename = `${slugify(section.title)}.md`;
  const filepath = path.join(OUTPUT_DIR, filename);

  // Add navigation footer to each page
  const sectionIndex = sections.findIndex(s => s.title === section.title);
  const prevSection = sectionIndex > 0 ? sections[sectionIndex - 1] : null;
  const nextSection = sectionIndex < sections.length - 1 ? sections[sectionIndex + 1] : null;

  let navigation = '\n\n---\n\n';
  if (prevSection || nextSection) {
    navigation += '## Navigation\n\n';
    if (prevSection) {
      navigation += `← Previous: [${prevSection.title}](${slugify(prevSection.title)}.md)\n\n`;
    }
    if (nextSection) {
      navigation += `Next: [${nextSection.title}](${slugify(nextSection.title)}.md) →\n`;
    }
  }

  fs.writeFileSync(filepath, section.content + navigation);
  console.log(`Created: ${filename}`);
});

console.log(`\n✅ Exploded ${sections.length} sections into ${OUTPUT_DIR}/`);
console.log(`📝 Created index.md`);

// Helper function to create URL-friendly slugs
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
