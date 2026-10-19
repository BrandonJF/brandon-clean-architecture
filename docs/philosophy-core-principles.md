## Philosophy & Core Principles

### What I Value

1. **Domain Isolation** - Domain functions express pure, reusable rules without framework dependencies
2. **Simple Vocabulary** - Clear, descriptive naming over jargon
3. **Dependency Inversion** - Abstractions over concretions at every boundary
4. **Declarative Over Imperative** - Express *what*, not *how*
5. **Fast Tests** - Authors keep domain/use-case feedback fast; <50 ms per small unit test serves as a goal, not an architectural deadline
6. **Developer Ergonomics** - Easy to navigate, understand, and modify
7. **Zero Framework Coupling in Core** - Business logic never imports from frameworks

### What I Avoid

- ❌ Jargon that obscures a capability: prefer `Transcriber` to an unexplained generic `ServiceManager`
- ❌ Framework dependencies in domain/application layers
- ❌ Heavy mocking frameworks (prefer test doubles)
- ❌ Generic `lib/` junk drawers
- ❌ Direct database/SDK access from UI or handlers
- ❌ `any` types
- ❌ Mutable state in domain logic
- ❌ Premature optimization

### Architecture Philosophy

**Clean Architecture with Functional Programming Bias**

- **Pure functions** for domain logic whenever possible
- **Classes** when behavior or invariants justify an instance; **functions** also express use cases with explicit dependencies
- **Interfaces** for all architectural boundaries
- **Explicit composition** over DI containers (type safety + simplicity)
- **Immutability by default** (`const`, spread operators, no mutations)
- **Explicit outcomes** for expected failures; let unexpected exceptions reach the boundary that can handle them

### Use-Case–Centric Design

I intentionally keep **use-cases as the main home of business logic**. A use-case should tell a complete story: validate input, load the right aggregates, apply domain rules, and persist changes.

Entities and value objects stay focused on **local invariants and correctness**, not on modeling entire workflows. This makes it easier to:

* Read a single use-case file and understand how the system behaves for a given operation.
* Unit test behavior at the "one use-case, one test suite" level.
* Keep the domain model small and composable instead of pushing every behavior onto entities.

This does lean a bit toward an "application-service–centric" style rather than a heavy rich domain model. I'm fine with that trade-off in TypeScript/Next.js projects because it keeps behavior easy to find and refactor, and keeps entities/VOs focused on invariants and correctness.

---

---

## Navigation

← Previous: [About This Guide](about-this-guide.md)

Next: [Architecture Layers](architecture-layers.md) →
