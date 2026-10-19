## Shared Capabilities & Governance

### Reference Stack and Package Boundaries

TwelveApart recommends strict TypeScript, ESM, readonly records, explicit operation contracts, boundary validation and consequence-proportional proof. React products may keep Next.js or TanStack Start; developer commands may keep Bun/Node composition. Products own persistence, configuration, credentials and deployment. Framework uniformity does not define architectural consistency.

Share a stable operation contract and the smallest useful implementation with a real source consumer. Put portable contracts and operations in the package root; put provider/runtime adapters in explicit subpaths. Evaluate reuse against a second project's actual semantics: common filenames or dependencies alone do not justify a package. Every plan and review asks, “Could another project use this?” When the answer warrants extraction, the owner files an issue in the appropriate TwelveApart repository rather than copying a private utility indefinitely.

The shared repository uses Bun workspaces, shared CI and Changesets. The release owner records per-package tags and changelogs, publishes immutable private `@twelveapart/*` releases to GitHub Packages, and verifies Bun/pnpm installation in the first delivery. Products pin exact versions and lockfiles. Owners need explicit approval before any public publication; a guide update does not authorize one. Teams prefer direct upstream libraries to repackaging registry UI or one-line helpers.

### Executable Repository Policy

Checkers separate reusable syntax analysis, snapshot acquisition and stable rule IDs from per-repository dependency maps, documentation standards, numerical limits and measured exceptions. Parse syntax rather than treating import-looking strings/comments as dependencies. Normalize paths at acquisition; keep Node-specific helpers out of a portable evaluator. Owners preserve useful negative fixtures and real installed-command proof during extraction.

Documentation enforcement may cover full file purpose and exported contracts, beyond a useful-header check. Owners coordinate existing enforcement instead of installing a weaker duplicate. Documentation shape cannot prove truth; reviewers check whether the actual implementation supports the claims. Repository maintainers configure policy openly and shrink measured exceptions rather than recapturing debt to hide a violation.

### Guide Evolution Versus Repository Drift

Teams update this guide through a focused reviewed PR when deliberate decisions improve the common architecture. A newer repository does not automatically overrule the guide. Application composition that imports concrete infrastructure contradicts the inward dependency rule: move the composition boundary instead of changing that rule. A regex import reader or Node-bound pure evaluator reflects a portability/parser limitation, not a portable reference design. Provider JSON casts, unbounded calls and hidden environment/singleton acquisition need explicit decoding, cancellation and injected effects during cohesive extraction; teams preserve useful behavior while fixing those gaps.

Teams use one proportionate review and the owning repository's quality gates for each repository change. The user reviews architectural policy changes. Teams standardize developer-agent orchestration on Herdr plus continuity; product workflow engines serve a separate responsibility. Repository owners keep their runtime, data and consent policies explicit rather than hiding them inside a shared package.

---

---

## Navigation

← Previous: [Migration Strategies](migration-strategies.md)

Next: [Summary: Quick Reference Checklist](summary-quick-reference-checklist.md) →
