# Brandon's Clean Architecture Guide

**My opinionated take on Clean Architecture** for TypeScript applications. TwelveApart uses this guide as its canonical, agent-readable architecture reference. The guide keeps a functional programming bias, SOLID principles and explicit boundaries across web, CLI and AI applications; its Next.js examples illustrate one legitimate platform adaptation.

**Last Updated**: 2026-10-19
**Author**: [Brandon John-Freso](https://www.linkedin.com/in/brandonjf)
**License**: MIT

---

## About This Guide

**The foundations of engineering are steady.** The patterns, the principles—they don't really change. You spend your 20s trying everything (and you should). Eventually you come back to: out of all of this, what actually worked?

This is my answer. A comprehensive guide reflecting core principles with my own sprinkle on top, built from experience at WeWork, OkCupid, and now running [Pier](https://pier.so), where I manage teams of AI agents building more AI.

### Who This Is For

This guide is for you if:

- ✅ You know **TypeScript** and a product framework; the Next.js examples assume app-router familiarity
- ✅ You've felt the pain of **"everything in lib/ / utils/"** architectures
- ✅ You're okay with **light FP ideas** (immutability, pure functions) but not looking for hardcore category theory
- ✅ You want **clear patterns** that scale from side projects to production teams

If you have just started TypeScript, build a small application first. This guide assumes that you know your tools and want to organize them around stable operations and interfaces.

---

## Quick Navigation

- [About This Guide](about-this-guide.md)
- [Philosophy & Core Principles](philosophy-core-principles.md)
- [Architecture Layers](architecture-layers.md)
- [Directory Structure](directory-structure.md)
- [Naming Conventions](naming-conventions.md)
- [Dependency Management](dependency-management.md)
- [Type System & Validation](type-system-validation.md)
- [Testing Strategy](testing-strategy.md)
- [Error Handling](error-handling.md)
- [Code Style & Patterns](code-style-patterns.md)
- [Next.js Integration](nextjs-integration.md)
- [Common Patterns](common-patterns.md)
- [Migration Strategies](migration-strategies.md)
- [Shared Capabilities & Governance](shared-capabilities-governance.md)
- [Summary: Quick Reference Checklist](summary-quick-reference-checklist.md)
- [Appendix: Example Project Structure](appendix-example-project-structure.md)
