## Appendix: Example Project Structure

This Next.js adaptation keeps portable operations separate from UI and server wiring. A TanStack or CLI shell substitutes its transport folders without changing the inward dependency rule. The illustration omits files that an actual capability does not need.

```text
my-product/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── README.md
│   │   │   ├── index.ts
│   │   │   ├── presentation.ts
│   │   │   ├── domain/
│   │   │   │   ├── entities/user.ts
│   │   │   │   ├── entities/user.test.ts
│   │   │   │   ├── value-objects/email.ts
│   │   │   │   └── errors/user-errors.ts
│   │   │   ├── application/
│   │   │   │   ├── repositories/user-repository.ts
│   │   │   │   ├── services/email-service.ts
│   │   │   │   ├── services/password-hasher.ts
│   │   │   │   └── use-cases/register-user/
│   │   │   │       ├── register-user-use-case.ts
│   │   │   │       ├── register-user-use-case.test.ts
│   │   │   │       └── contracts.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/prisma-user-repository.ts
│   │   │   │   ├── repositories/prisma-user-repository.integration.test.ts
│   │   │   │   ├── services/resend-email-service.ts
│   │   │   │   └── mappers/user-mapper.ts
│   │   │   ├── api/composition.ts
│   │   │   ├── api/composition.test.ts
│   │   │   ├── components/register-form.tsx
│   │   │   └── hooks/use-registration.ts
│   │   └── billing/
│   │       ├── README.md
│   │       ├── index.ts
│   │       ├── domain/invoice.ts
│   │       ├── application/create-invoice.ts
│   │       ├── infrastructure/prisma-invoice-repository.ts
│   │       └── api/composition.ts
│   ├── shared/
│   │   ├── kernel/contracts.ts
│   │   └── ui/button.tsx
│   ├── infrastructure/prisma.ts
│   ├── config/env.ts
│   └── app/
│       ├── (auth)/register/page.tsx
│       ├── api/auth/register/route.ts
│       ├── actions/auth-actions.ts
│       └── layout.tsx
├── prisma/schema.prisma
├── tests/
│   ├── e2e/auth.spec.ts
│   └── packages/installed-consumer.test.ts
├── .env.example                       # Names only; never real credentials
├── tsconfig.json
└── package.json                        # Exact shared-package versions
```

---

**End of Guide**

*Owners update this living guide as architectural decisions evolve.*
*Always follow clean arch, it's not that much overhead.*

---

**Remember:**
- Domain expresses pure rules and invariants
- Application owns named workflows and their IO contracts
- Infrastructure handles frameworks, APIs, databases
- Always dependency inversion (interfaces over implementations)
- Prefer test doubles over mocks
- Functional programming bias (pure, immutable)
- Capability modules contain only the layers they need
- Public roots and explicit runtime entries protect boundaries
- Next.js routes/actions call use-cases, never repositories directly

**When in doubt:** Ask "Does this violate dependency inversion?" If yes, refactor.

---

## Navigation

← Previous: [Summary: Quick Reference Checklist](summary-quick-reference-checklist.md)
