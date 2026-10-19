## Migration Strategies

### Deliver Thin Complete User Journeys

Migrate one useful operation through all its affected in-product callers. Do not convert the whole codebase horizontally before users receive a working journey.

1. Characterize the real operation and saved-data behavior with independently known expectations.
2. Extract pure rules and name the application operation; place IO interfaces in the consuming inner layer.
3. Implement adapters around existing persistence/provider behavior and wire them in composition.
4. Switch every affected route, browser/CLI controller and in-product caller of that responsibility together.
5. Run affected boundary proof, preserve saved data through any necessary migration, then delete the superseded path.

An intermediate local refactor may leave work incomplete; do not present a route with temporary direct database orchestration as the delivered clean-architecture outcome. Compatibility needs an explicit version or data requirement, not an automatic parallel implementation.

### New Capabilities

Start new work with the smallest needed module shape. A pure capability may need only `domain/` and `index.ts`; a persistence-backed workflow adds application interfaces, adapters and `api/composition.ts`. Add a README and explicit public surface; avoid empty mandatory folders.

### Adoption Across Independent Products

Extract from a real source consumer and switch that source to the released exact version in the same effort. A detached demonstration does not complete extraction. Other products adopt when their owners next touch the area, through a tracking issue with parity proof. Teams keep exact old versions until that migration and never force an inactive product to adopt. Teams remove duplicate implementations of the migrated responsibility within each adopting product while preserving saved data.

---

---

## Navigation

← Previous: [Common Patterns](common-patterns.md)

Next: [Shared Capabilities & Governance](shared-capabilities-governance.md) →
