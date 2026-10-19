## Naming Conventions

### Files

| Type | Pattern | Examples |
|------|---------|----------|
| **Use Case** | `<verb>-<noun>-use-case.ts` or `<verb>-<noun>.ts` | `register-user-use-case.ts`, `extract-propositions.ts` |
| **Entity** | `<noun>.ts` | `user.ts`, `invoice.ts`, `subscription.ts` |
| **Value Object** | `<noun>.ts` | `email.ts`, `user-id.ts`, `money.ts` |
| **Repository Interface** | `<noun>-repository.ts` | `user-repository.ts`, `order-repository.ts` |
| **Repository Impl** | `<source>-<noun>-repository.ts` | `prisma-user-repository.ts`, `in-memory-user-repository.ts` |
| **Service Interface** | `<noun>-service.ts` | `email-service.ts`, `payment-service.ts` |
| **Service Impl** | `<provider>-<noun>-service.ts` | `resend-email-service.ts`, `stripe-payment-service.ts` |
| **Mapper** | `<noun>-mapper.ts` | `user-mapper.ts`, `invoice-mapper.ts` |
| **Test Double** | `fake-<noun>.ts` or `in-memory-<noun>.ts` | `fake-email-service.ts`, `in-memory-user-repository.ts` |
| **Types** | `types.ts`, `contracts.ts`, or a small colocated declaration | Keep types with their owning capability |
| **Errors** | `<domain>-errors.ts` | `user-errors.ts`, `auth-errors.ts` |
| **Component** | `<noun>.tsx` or `<noun>-<type>.tsx` | `button.tsx`, `login-form.tsx` |
| **Hook** | `use-<noun>.ts` | `use-auth.ts`, `use-user-data.ts` |
| **Public Entry** | `index.ts`, plus explicit runtime entries | Module/package root; `presentation.ts`, `/node` |

### Classes & Interfaces

| Type | Pattern | Examples |
|------|---------|----------|
| **Use Case** | `<Verb><Noun>UseCase` or `verbNoun` | `RegisterUserUseCase.execute`, `extractPropositions` |
| **Entity** | `<Noun>` | `User`, `Invoice`, `Subscription` |
| **Value Object** | `<Noun>` | `Email`, `UserId`, `Money` |
| **Repository** | `<Noun>Repository` (interface) | `UserRepository`, `OrderRepository` |
| **Repository Impl** | `<Source><Noun>Repository` | `PrismaUserRepository`, `InMemoryUserRepository` |
| **Service** | `<Noun>Service` (interface) | `EmailService`, `PaymentService` |
| **Service Impl** | `<Provider><Noun>Service` | `ResendEmailService`, `StripePaymentService` |
| **Error** | `<Noun>Error` | `InvalidEmailError`, `UserNotFoundError` |
| **Mapper** | `<Noun>Mapper` | `UserMapper`, `InvoiceMapper` |
| **Config** | `<Noun>Config` | `EmailConfig`, `DatabaseConfig` |

### Operation Vocabulary

Name use cases with a verb and its object. A class uses `ExtractPropositionsUseCase.execute(input)`; a function uses `extractPropositions(input, dependencies)`. Name interfaces for capabilities: `StructuredGenerator.generate`, `Transcriber.transcribe`, `RepositorySnapshotReader.readRevision`, `ErrorReporter.report`.

| Verb | Contract meaning |
|------|------------------|
| `find` | Optional lookup; return an explicit absence such as `null` |
| `get` | Required lookup; declare the missing outcome |
| `list` | Collection; declare ordering and pagination |
| `save` | Persistence; declare overwrite, concurrency and atomicity semantics |
| `extract` | Structured material from a source |
| `assess` | Judgment under a named policy |
| `delete` | Removal; declare absent-item and retention behavior |

Authors name side effects, expected failures and ordering in each operation contract. Avoid generic `run`, `process` or `handle` when the domain offers a clearer verb. A **port** means an interface at a boundary; authors need not append `Port`, `Service` or `Gateway` to every name. Provider names belong in implementations or factories, such as `createAiSdkStructuredGenerator`. Teams retain existing names until cohesive work reaches that operation.

### Variables & Constants

```typescript
// Constants: SCREAMING_SNAKE_CASE
export const MAX_LOGIN_ATTEMPTS = 5;
export const DEFAULT_TIMEOUT_MS = 3000;

// Variables: camelCase
const userId = UserId.create(rawId);
const isValid = email.validate();

// Private class members: camelCase with 'private' keyword (not underscore prefix)
class User {
  private status: UserStatus; // ✅
  private _status: UserStatus; // ❌ Avoid underscore prefix
}

// Booleans: is/has/can prefix
const isActive = user.status.isActive();
const hasPermission = user.canAccessFeature(feature);
```

---

---

## Navigation

← Previous: [Directory Structure](directory-structure.md)

Next: [Dependency Management](dependency-management.md) →
