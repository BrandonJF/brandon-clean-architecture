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

// Keep GUIDE.md authoritative for the home page and section pages.
let currentSection = null;
let sections = [];
let currentContent = [];
let inTableOfContents = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Source-only anchors do not resolve from generated section pages.
  if (line.startsWith('## Table of Contents')) {
    inTableOfContents = true;
    continue;
  }
  if (inTableOfContents) {
    if (!line.startsWith('## ')) continue;
    inTableOfContents = false;
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

// Preserve source metadata and introduction instead of maintaining a second guide.
const introduction = content.split(/^## Table of Contents\s*$/m)[0].trim();
const indexContent = `${introduction}

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

  fs.writeFileSync(filepath, (section.content + navigation).trimEnd() + '\n');
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
