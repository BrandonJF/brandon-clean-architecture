## Directory Structure

### Capability Modules (Reference Shape)

Organize code by capability under `src/modules/<capability>`, then add only the layers that capability needs. Existing projects may retain `features/` as an alias until cohesive work reaches that owner. An empty folder does not enforce architecture.

```text
src/
├── modules/
│   └── auth/
│       ├── README.md
│       ├── index.ts                   # Portable contracts and operations
│       ├── presentation.ts            # React-only public exports, when needed
│       ├── domain/
│       │   ├── entities/user.ts
│       │   └── value-objects/email.ts
│       ├── application/
│       │   ├── repositories/user-repository.ts
│       │   ├── services/email-service.ts
│       │   └── use-cases/register-user/register-user-use-case.ts
│       ├── infrastructure/
│       │   ├── repositories/prisma-user-repository.ts
│       │   └── services/resend-email-service.ts
│       ├── api/
│       │   └── composition.ts         # Concrete server wiring
│       ├── components/register-form.tsx
│       └── hooks/use-registration.ts
├── shared/
│   ├── kernel/                        # Small, stable domain-neutral contracts
│   └── ui/                            # Shared presentation primitives
├── app/                               # Next.js transport and rendering
│   ├── api/auth/register/route.ts
│   └── layout.tsx
└── config/env.ts                      # Product-owned boundary configuration
```

### Key Principles

1. **Capability ownership.** A module owns its rules, workflows and adapters; UI may live alongside its capability. Teams keep a global UI folder only for genuinely shared presentation.
2. **Consumer-owned interfaces.** Domain owns domain abstractions; application owns workflow IO. Infrastructure implements those contracts.
3. **Public boundaries.** Each module exposes an `index.ts` and README. Cross-module callers use the public API. Owners may use private relative imports internally; they need no barrel in every directory.
4. **Runtime separation.** Keep React and concrete server/browser adapters out of the portable root. Expose UI through `presentation.ts`, composition through `api/`, and package runtimes through explicit subpaths such as `/react` or `/node`.
5. **Focused types.** Use `domain/types.ts` or a focused `contracts.ts` for records; colocate a small operation type with its owner when that improves clarity.
6. **Small shared kernel.** Share stable domain-neutral contracts deliberately. Prefer a capability owner to a generic `utils` or `server` bucket; keep standard-library one-liners local. Never impose one product's entire error-code union on every product.

---

---

## Navigation

← Previous: [Architecture Layers](architecture-layers.md)

Next: [Naming Conventions](naming-conventions.md) →
