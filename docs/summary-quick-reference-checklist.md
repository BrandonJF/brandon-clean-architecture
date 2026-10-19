## Summary: Quick Reference Checklist

Authors check the following before delivery.

### Layer Rules and Injection

- [ ] Domain owns meanings, invariants and pure rules; application owns workflows.
- [ ] The consuming inner layer owns each interface, including application IO contracts.
- [ ] Constructors, parameters or explicit factories inject dependencies; core code never acquires hidden infrastructure.
- [ ] Framework, transport, persistence and provider types stop at adapters.
- [ ] Composition wires concrete adapters outside application.

### Operations and Types

- [ ] Class `execute` methods or named functions declare inputs, outputs and expected failures.
- [ ] Capability nouns and precise verbs describe lookup, ordering, overwrite and effect semantics.
- [ ] Readonly interfaces model records; justified classes enforce behavior or invariants.
- [ ] Boundary decoders validate unknown input and provider output; casts do not substitute for validation.
- [ ] Adapters distinguish cancellation, timeout and provider failures and redact private content.

### Testing and Migration

- [ ] Tests import actual implementations and assert independently known results.
- [ ] Fakes support fast operation tests; actual adapters and installed archives prove their boundaries.
- [ ] Assertions cover a cohesive behavior; ratios, timing and colocation serve goals rather than universal rules.
- [ ] The team migrates affected in-product callers together, deletes old paths and preserves saved data.
- [ ] Extraction includes the real source consumer; other products adopt exact versions on touch.

### Naming, Organization and UI

- [ ] Capability modules expose a README and public root, with only the layers they need.
- [ ] Cross-module callers use public APIs; private relative imports remain legitimate.
- [ ] Runtime subpaths separate portable operations, React presentation and server/browser composition.
- [ ] Presentation leaves render view models and emit intents; controllers consume composed operations.
- [ ] Thin routes, actions and commands decode input and map outcomes; repositories own persistent authority.
- [ ] Hooks/store choices fit UI complexity; products retain legitimate platform adaptations.

### Core Behavior and Governance

- [ ] Core transitions preserve caller-owned data and receive time/IDs explicitly when rules need them.
- [ ] Transaction callbacks use narrow capabilities and keep external effects outside retryable work.
- [ ] Comments explain intent; authors use active voice, name actors and avoid `any`.
- [ ] The plan/review asks whether another project can reuse the capability and tracks justified extraction.
- [ ] Checkers separate shared analysis from repository policy; reviewers check documentation truth.
- [ ] The owner records evolving architectural decisions in this guide through one focused review.

---

---

## Navigation

← Previous: [Shared Capabilities & Governance](shared-capabilities-governance.md)

Next: [Appendix: Example Project Structure](appendix-example-project-structure.md) →
