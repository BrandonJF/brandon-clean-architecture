# Brandon's Clean Architecture Guide

> My opinionated take on Clean Architecture for TypeScript/Next.js projects, distilled from over 15 years of building production systems across web, mobile, and AI platforms.

**Author**: [Brandon John-Freso](https://www.linkedin.com/in/brandonjf)
**License**: MIT
**Last Updated**: 2025-12-09

---

## 📖 Read the Guide

**[🌐 View Documentation Website →](https://brandonjf.github.io/brandon-clean-architecture/)**

The complete guide is available as a beautiful, searchable documentation site built with MkDocs Material.

### Quick Links

- [Philosophy & Core Principles](https://brandonjf.github.io/brandon-clean-architecture/philosophy-core-principles/)
- [Architecture Layers](https://brandonjf.github.io/brandon-clean-architecture/architecture-layers/)
- [Next.js Integration](https://brandonjf.github.io/brandon-clean-architecture/nextjs-integration/)
- [Quick Reference Checklist](https://brandonjf.github.io/brandon-clean-architecture/summary-quick-reference-checklist/)

---

## 🎯 What's Inside

**The foundations of engineering are steady.** The patterns, the principles—they don't really change. You spend your 20s trying everything (and you should). Eventually you come back to: out of all of this, what actually worked?

This is my answer. Core principles with my own sprinkle on top, built from experience at WeWork, OkCupid, and now running [Pier](https://pier.so), where I manage teams of AI agents building more AI.

**What this guide covers:**

- **Feature-first directory structure** (not layer-first)
- **Dependency inversion** patterns and composition roots
- **Testing with test doubles** (not mocking frameworks)
- **Next.js integration** - Server Components, Server Actions, API Routes
- **Type system best practices** - Zod validation, interface vs type
- **Migration strategies** from messy codebases
- **Complete working examples**

### Philosophy

**"Always follow clean arch, it's not that much overhead."**

I prioritize:
- ✅ Domain isolation
- ✅ Developer ergonomics
- ✅ Fast tests (<50ms for unit tests)
- ✅ Simple, clear vocabulary (no heavy jargon)
- ✅ Functional programming bias

---

## 🚀 For Developers

### Local Development

```bash
# Install Python dependencies
pip install -r requirements.txt

# Serve docs locally
mkdocs serve
# or
npm run docs:dev

# Visit http://localhost:8000
```

### Building the Docs

The documentation is generated from [`GUIDE.md`](GUIDE.md) using a markdown exploder script:

```bash
# Explode GUIDE.md into separate pages in docs/
npm run explode

# Build static site
mkdocs build
# or
npm run docs:build
```

### Project Structure

```
brandon-clean-architecture/
├── README.md              # This file (overview)
├── GUIDE.md               # Full guide source (2000+ lines)
├── docs/                  # Generated from GUIDE.md
│   ├── index.md
│   ├── philosophy-core-principles.md
│   ├── architecture-layers.md
│   └── ...
├── scripts/
│   └── explode-markdown.js   # Splits GUIDE.md into docs/
├── mkdocs.yml             # MkDocs configuration
├── requirements.txt       # Python dependencies (mkdocs, material)
└── package.json           # npm scripts
```

---

## 🤝 Contributing

This is a living document reflecting my personal preferences. If you find errors or have suggestions:

1. Open an issue
2. Submit a PR with improvements
3. Share your own architectural decisions!

**To update the guide:**
1. Edit [`GUIDE.md`](GUIDE.md)
2. Run `npm run explode` to regenerate docs
3. Commit both GUIDE.md and docs/

---

## 📄 License

MIT License - Copyright (c) 2025 Brandon John-Freso

See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with:
- [MkDocs](https://www.mkdocs.org/) - Documentation generator
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) - Beautiful theme
- Clean Architecture principles from Robert C. Martin
- Years of production experience

---

**Made with ❤️ for developers who care about architecture**
