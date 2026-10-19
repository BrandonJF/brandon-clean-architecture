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

## Table of Contents

1. [Philosophy & Core Principles](#philosophy--core-principles)
2. [Architecture Layers](#architecture-layers)
3. [Directory Structure](#directory-structure)
4. [Naming Conventions](#naming-conventions)
5. [Dependency Management](#dependency-management)
6. [Type System & Validation](#type-system--validation)
7. [Testing Strategy](#testing-strategy)
8. [Error Handling](#error-handling)
9. [Code Style & Patterns](#code-style--patterns)
10. [Next.js Integration](#nextjs-integration)
11. [Common Patterns](#common-patterns)
12. [Migration Strategies](#migration-strategies)
13. [Shared Capabilities & Governance](#shared-capabilities--governance)
14. [Summary: Quick Reference Checklist](#summary-quick-reference-checklist)
15. [Appendix: Example Project Structure](#appendix-example-project-structure)

---

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

## Architecture Layers

### The Three Layers

```
┌─────────────────────────────────────────┐
│   Infrastructure (Outer)                │
│   - Frameworks (Next.js, React)         │
│   - External APIs (REST, GraphQL)       │
│   - Databases (Prisma, Drizzle)         │
│   - UI Components                       │
│   - HTTP Handlers                       │
└──────────────┬──────────────────────────┘
               │ depends on ↓
┌──────────────▼──────────────────────────┐
│   Application (Middle)                  │
│   - Use Cases                           │
│   - Orchestration                       │
│   - Application Services                │
└──────────────┬──────────────────────────┘
               │ depends on ↓
┌──────────────▼──────────────────────────┐
│   Domain (Inner)                        │
│   - Entities                            │
│   - Value Objects                       │
│   - Business Rules                      │
│   - Domain-owned Contracts              │
│   - Pure Policies                       │
└─────────────────────────────────────────┘
```

### Layer Rules

The examples show focused excerpts, not one copy-and-paste application. Each capability supplies its own imports, complete records, decoders and configuration. Domain owns meaning, application owns workflows and their consumed IO interfaces, and infrastructure implements effects.

#### Domain Layer (Innermost)
**Responsibilities:**
- Encapsulate invariants and domain rules
- Entities with focused behavior (validation, state transitions)
- Value objects (immutable, validated types)
- Contracts that express genuine domain abstractions
- Pure policies; application workflows own their IO interfaces

**What belongs here:**
- Local invariants (valid email, non-empty ID, password constraints)
- Simple domain helpers and convenience methods
- Domain rules that don't require orchestration (e.g., `canAccessFeature`)

**What does NOT belong here:**
- Multi-step workflows (those live in use-cases)
- Orchestration across multiple repositories or services
- Knowledge of infrastructure details

**Import Rules:**
- ✅ Can import: Domain types, pure functions and explicitly permitted runtime-neutral libraries
- ❌ Cannot import: Application, Infrastructure, Frameworks

**Examples:**
```typescript
// domain/entities/user.ts
export class User {
  private constructor(
    public readonly id: UserId,
    public readonly email: Email,
    public readonly profile: UserProfile,
    private readonly status: UserStatus
  ) {}

  static create(props: CreateUserProps): User {
    // Validate invariants
    if (!props.email.isValid()) {
      throw new InvalidEmailError(props.email.value);
    }
    return new User(props.id, props.email, props.profile, props.status);
  }

  activate(): User {
    if (this.status.isActive()) {
      throw new UserAlreadyActiveError(this.id);
    }
    return new User(this.id, this.email, this.profile, UserStatus.active());
  }

  // Domain rule: business logic method
  canAccessFeature(feature: Feature): boolean {
    return this.profile.tier.includes(feature) && this.status.isActive();
  }
}

```

Application owns the IO contracts its registration workflow consumes:

```typescript
// application/repositories/user-repository.ts
export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
  findByEmail(email: Email): Promise<User | null>;
}

// application/services/email-service.ts
export interface EmailService {
  sendWelcomeEmail(user: User): Promise<void>;
  sendPasswordReset(email: Email, token: string): Promise<void>;
}
```

#### Application Layer (Middle)
**Responsibilities:**
- Use cases (application-specific workflows)
- Orchestrate domain entities and services
- Define Input/Output types for operations
- Application-level validation
- Interfaces for workflow IO: repositories, generators, email senders and snapshot readers

**Import Rules:**
- ✅ Can import: Domain (entities, interfaces, value objects)
- ❌ Cannot import: Infrastructure, Frameworks

### Where Does the Business Logic Live?

In this architecture, **most business logic lives in the Application layer, inside use-cases**. A use-case is the primary unit of behavior: it coordinates repositories, domain types, and policies to perform a single, well-named operation (e.g. `RegisterUserUseCase`, `UpgradeSubscriptionUseCase`).

The **Domain layer is responsible for rules and invariants**, not full workflows. Entities and value objects:

* Encapsulate validation and invariants (a valid `Email`, a `User` that is always in a consistent state).
* Expose simple behavior and helper methods where it improves clarity.

Multi-step processes, branching logic, and orchestration across multiple repositories or services live in use-cases, not on entities. This keeps entities/value objects small and predictable while making use-cases the clearest place to read "what actually happens" for a given operation.

The registration excerpts use a declared exception convention for expected conflicts; the Error Handling section also shows typed outcomes. A failed welcome email after persistence does not roll back the saved user. Products that require durable notification delivery should commit an outbox entry with the registration and send it separately.

**Examples:**
```typescript
// application/use-cases/register-user/register-user-use-case.ts
export interface RegisterUserInput {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}

export interface RegisterUserOutput {
  readonly userId: string;
  readonly success: true;
}

export class RegisterUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService,
    private passwordHasher: PasswordHasher
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    // 1. Decode input at transport, then enforce domain invariants
    const email = Email.create(input.email);
    const hashedPassword = await this.passwordHasher.hash(input.password);

    // 2. Check business rules
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new UserAlreadyExistsError(email);
    }

    // 3. Create entity
    const user = User.create({
      email,
      password: hashedPassword,
      profile: UserProfile.create({ name: input.name }),
    });

    // 4. Persist
    await this.userRepo.save(user);

    // 5. Side effects
    await this.emailService.sendWelcomeEmail(user);

    return {
      userId: user.id.value,
      success: true,
    };
  }
}
```

#### Infrastructure Layer (Outermost)
**Responsibilities:**
- Framework code (Next.js, React)
- External system adapters (APIs, databases)
- UI components
- Repository implementations
- Service implementations

**Import Rules:**
- ✅ Can import: Domain, Application, External SDKs
- ✅ The only layer that imports frameworks

**Examples:**
```typescript
// infrastructure/repositories/prisma-user-repository.ts
export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: UserId): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id: id.value },
    });
    return record ? UserMapper.toDomain(record) : null;
  }

  async save(user: User): Promise<void> {
    const data = UserMapper.toPersistence(user);
    await this.prisma.user.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }
}

// infrastructure/services/resend-email-service.ts
export class ResendEmailService implements EmailService {
  constructor(private resend: Resend) {}

  async sendWelcomeEmail(user: User): Promise<void> {
    await this.resend.emails.send({
      from: 'noreply@example.com',
      to: user.email.value,
      subject: 'Welcome!',
      html: WelcomeEmailTemplate.render(user),
    });
  }
}
```

---

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

## Dependency Management

### Dependency Inversion Principle

**Rule**: High-level modules (use-cases) should not depend on low-level modules (databases, APIs). Both should depend on abstractions (interfaces).

#### Pattern: Interface in the Consuming Inner Layer

```typescript
// ✅ CORRECT
// application/repositories/user-repository.ts
export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
}

// infrastructure/repositories/prisma-user-repository.ts
export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: UserId): Promise<User | null> {
    // Prisma-specific implementation
  }
}

// application/use-cases/get-user/get-user-use-case.ts
export class GetUserUseCase {
  constructor(private userRepo: UserRepository) {} // ✅ Depends on interface

  async execute(input: GetUserInput): Promise<GetUserOutput> {
    const user = await this.userRepo.findById(input.userId);
    // ...
  }
}
```

```typescript
// ❌ WRONG
// application/use-cases/get-user/get-user-use-case.ts
import { PrismaClient } from '@prisma/client'; // ❌ Application depends on framework

export class GetUserUseCase {
  constructor(private prisma: PrismaClient) {} // ❌ Depends on concrete implementation

  async execute(input: GetUserInput): Promise<GetUserOutput> {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    // ❌ Use-case knows about database structure
  }
}
```

### Explicit Dependency Injection

The consuming inner layer owns each interface: domain for genuine domain abstractions, application for workflow IO. Inject dependencies through constructors, explicit function parameters or factories. Never acquire infrastructure through a hidden core singleton. Framework transport and persistence types stop at adapters.

```typescript
// ✅ CORRECT: The caller injects dependencies
export class RegisterUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService,
    private passwordHasher: PasswordHasher
  ) {}
}

// ❌ WRONG: The class acquires concrete dependencies
export class RegisterUserUseCase {
  private userRepo = new PrismaUserRepository(new PrismaClient()); // ❌
  private emailService = new ResendEmailService(new Resend()); // ❌
}

// ❌ WRONG: Importing singletons
import { db } from '@/lib/db'; // ❌

export class RegisterUserUseCase {
  async execute(input: RegisterUserInput) {
    const user = await db.user.findUnique({ ... }); // ❌
  }
}
```

### Function Use Cases

Functions follow the same dependency rule as classes. This use case consumes an application-owned IO contract; its caller supplies the implementation.

```typescript
// modules/documents/application/extract-propositions.ts
export interface Proposition {
  readonly text: string;
}

export interface PropositionExtractor {
  extract(source: string): Promise<readonly Proposition[]>;
}

export interface ExtractPropositionsInput {
  readonly source: string;
}

export async function extractPropositions(
  input: ExtractPropositionsInput,
  dependencies: { readonly extractor: PropositionExtractor }
): Promise<readonly Proposition[]> {
  return dependencies.extractor.extract(input.source);
}
```

### Composition Root Pattern

Each capability wires concrete implementations outside application, usually in `api/composition.ts`. This boundary may import private infrastructure files; the portable public root must not reexport the effectful composition.

```typescript
// modules/auth/api/composition.ts
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { RegisterUserUseCase } from '../application/use-cases/register-user/register-user-use-case';
import { PrismaUserRepository } from '../infrastructure/repositories/prisma-user-repository';
import { ResendEmailService } from '../infrastructure/services/resend-email-service';
import { BCryptPasswordHasher } from '../infrastructure/services/bcrypt-password-hasher';

export function createAuthCompositionRoot(config: {
  prisma: PrismaClient;
  resendApiKey: string;
}) {
  // Infrastructure implementations
  const userRepo = new PrismaUserRepository(config.prisma);
  const emailService = new ResendEmailService(new Resend(config.resendApiKey));
  const passwordHasher = new BCryptPasswordHasher();

  // Use cases
  const registerUserUseCase = new RegisterUserUseCase(
    userRepo,
    emailService,
    passwordHasher
  );

  const loginUseCase = new LoginUseCase(userRepo, passwordHasher);

  // Return the composed operations to the server transport
  return {
    registerUser: registerUserUseCase,
    login: loginUseCase,
  };
}

// Usage in Next.js API route
// app/api/auth/register/route.ts
import { createAuthCompositionRoot } from '@/modules/auth/api/composition';
import { RegisterRequestSchema } from '@/modules/auth/api/register-request';
import { prisma } from '@/infrastructure/prisma';
import { env } from '@/config/env';

export async function POST(request: Request) {
  const auth = createAuthCompositionRoot({
    prisma,
    resendApiKey: env.RESEND_API_KEY,
  });

  const body = await request.json();
  const input = RegisterRequestSchema.parse(body);
  const result = await auth.registerUser.execute(input);

  return Response.json(result);
}
```

### Test Composition Root

```typescript
// modules/auth/api/composition.test.ts
export function createTestAuthCompositionRoot() {
  // Test doubles
  const userRepo = new InMemoryUserRepository();
  const emailService = new FakeEmailService();
  const passwordHasher = new FakePasswordHasher();

  // Use cases with test doubles
  const registerUserUseCase = new RegisterUserUseCase(
    userRepo,
    emailService,
    passwordHasher
  );

  return {
    registerUser: registerUserUseCase,
    // Test helpers
    testHelpers: {
      userRepo, // Expose for assertions
      emailService,
    },
  };
}
```

### No DI Containers

**Prefer explicit composition over DI containers (InversifyJS, tsyringe, etc.)**

**Why:**
- ✅ Type safety: TypeScript checks all wiring at compile time
- ✅ Simplicity: No decorators, no reflection, no magic
- ✅ Debuggability: Clear call stacks
- ✅ IDE support: Go-to-definition works perfectly

---

## Type System & Validation

### Interface vs Type

**Use `interface` for:**
- Contracts (repository interfaces, service interfaces)
- Readonly records and object shapes that callers may extend
- Public APIs

**Use `type` for:**
- Unions: `type Status = 'active' | 'inactive'`
- Intersections: `type UserWithProfile = User & Profile`
- Mapped types: `type Readonly<T> = { readonly [K in keyof T]: T[K] }`
- Primitives: `type UserId = string`

```typescript
// ✅ Interface for contracts
export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
}

// ✅ Type for unions
export type UserStatus = 'active' | 'suspended' | 'deleted';

// ✅ Type for intersections
export type EnrichedUser = User & { profile: UserProfile };
```

### Class vs Interface

**Use `class` for:**
- Entities with behavior (domain objects)
- Use cases when an instance improves explicit composition; otherwise use an injected function
- Value objects with validation

**Use `interface` for:**
- Contracts (repositories, services)
- DTOs (data transfer objects)
- Configuration objects

```typescript
// ✅ Class for entity with behavior
export class User {
  constructor(
    public readonly id: UserId,
    private readonly status: UserStatus
  ) {}

  activate(): User {
    return new User(this.id, 'active');
  }

  isActive(): boolean {
    return this.status === 'active';
  }
}

// ✅ Interface for contract
export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
}

// ✅ Interface for DTO
export interface RegisterUserInput {
  readonly email: string;
  readonly password: string;
}
```

### Type-Only Files

Keep behavior-free records in `domain/types.ts` or focused `contracts.ts` files. Colocate a small operation type when that improves ownership. Classes and value objects need behavior or invariant enforcement to justify an instance; authors need not wrap every record in a class.

```typescript
// modules/auth/application/use-cases/register-user/types.ts
export interface RegisterUserInput {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}

export interface RegisterUserOutput {
  readonly userId: string;
  readonly success: true;
}

// modules/auth/application/use-cases/register-user/register-user-use-case.ts
import { RegisterUserInput, RegisterUserOutput } from './types';

export class RegisterUserUseCase {
  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    // ...
  }
}

// modules/auth/application/use-cases/register-user/index.ts
export { RegisterUserUseCase } from './register-user-use-case';
export type { RegisterUserInput, RegisterUserOutput } from './types';
```

### Boundary Validation

Validate unknown input and provider output before use. A type assertion does not validate data. Zod works well when a consumer needs runtime schemas; a small explicit decoder also works when its owner already defines that closed format. Keep AI SDK, ORM and framework types outside portable operation interfaces.

**Use Zod for:**
- Runtime validation at boundaries (API routes, form inputs)
- Domain value object validation
- External data validation (API responses)

**Location:**
- Domain validation schemas → `domain/schemas/` when they express domain meaning
- Boundary validation → co-located with handler/component

```typescript
// domain/value-objects/email.ts
import { z } from 'zod';

const EmailSchema = z.string().email().max(255);

export class Email {
  private constructor(public readonly value: string) {}

  static create(value: string): Email {
    const result = EmailSchema.safeParse(value);
    if (!result.success) {
      throw new InvalidEmailError(value);
    }
    return new Email(result.data);
  }

  isValid(): boolean {
    return EmailSchema.safeParse(this.value).success;
  }
}

// modules/auth/api/register-request.ts
import { z } from 'zod';

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

// app/api/auth/register/route.ts (auth comes from server composition)
export async function POST(request: Request) {
  const body = await request.json();
  const validated = RegisterRequestSchema.parse(body); // The transport maps validation failure to 400

  const result = await auth.registerUser.execute(validated);
  return Response.json(result);
}
```

### Type Inference vs Explicit Types

**Default: Explicit return types, inferred locals**

```typescript
// ✅ CORRECT: Explicit return type, inferred locals
export class RegisterUserUseCase {
  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> { // ✅ Explicit
    const email = Email.create(input.email); // ✅ Inferred
    const user = User.create({ email, ... }); // ✅ Inferred
    return { userId: user.id.value, success: true }; // ✅ Type-checked against return type
  }
}

// ❌ WRONG: No return type
export class RegisterUserUseCase {
  async execute(input: RegisterUserInput) { // ❌ No return type
    // ...
  }
}
```

### Zero `any` Types

**Never use `any`. Use `unknown` when type is truly unknown.**

```typescript
// ❌ WRONG
function parseJson(json: string): any { // ❌
  return JSON.parse(json);
}

// ✅ CORRECT
function parseJson<T>(json: string, schema: z.ZodType<T>): T {
  const data: unknown = JSON.parse(json); // ✅ unknown until validated
  return schema.parse(data); // ✅ Now T
}
```

---

## Testing Strategy

### Consequence-Proportional Proof

```
        ┌─────────────┐
        │   E2E (5%)  │  Playwright, user flows
        ├─────────────┤
        │ Integration │  API routes, DB, external services
        │    (25%)    │
        ├─────────────┤
        │    Unit     │  Use-cases (primary), domain entities/VOs
        │    (70%)    │  <50ms each
        └─────────────┘
```

Treat the illustrated 70/25/5 ratios and unit timing as goals, not quotas or universal deadlines. Select proof from the consequence and owning boundary. Import actual implementations; tests that copy schema, retry or mapping logic cannot prove the production adapter. Independently authored expectations must check the intended user result.

**For most business behavior, the main unit of test is the use-case.** Entities and value objects get focused tests around invariants and validation. Use-cases are where you verify complete workflows and business logic.

### Test Organization

Place tests at the boundary they prove. Colocation helps small owned units; a repository-level suite may own cross-module, installed-package or browser behavior. The following layout illustrates colocation, not a universal requirement:

```
modules/auth/
├── domain/
│   ├── entities/
│   │   ├── user.ts
│   │   └── user.test.ts              # ✅ Co-located
│   ├── value-objects/
│   │   ├── email.ts
│   │   └── email.test.ts             # ✅ Co-located
├── application/
│   ├── use-cases/
│   │   ├── register-user/
│   │   │   ├── register-user-use-case.ts
│   │   │   └── register-user-use-case.test.ts  # ✅ Co-located
├── infrastructure/
│   └── repositories/
│       ├── prisma-user-repository.ts
│       └── prisma-user-repository.integration.test.ts  # ✅ Integration test
```

### Test Doubles Over Mocking Frameworks

**Prefer Fake implementations (test doubles) over mocking libraries.**

```typescript
// ✅ CORRECT: Fake implementation
// infrastructure/test-doubles/in-memory-user-repository.ts
export class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();

  async findById(id: UserId): Promise<User | null> {
    return this.users.get(id.value) || null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id.value, user);
  }

  // Test helper
  clear(): void {
    this.users.clear();
  }
}

// Test
describe('RegisterUserUseCase', () => {
  it('should register a new user', async () => {
    const userRepo = new InMemoryUserRepository(); // ✅ Fake
    const emailService = new FakeEmailService(); // ✅ Fake
    const passwordHasher = new FakePasswordHasher();
    const useCase = new RegisterUserUseCase(userRepo, emailService, passwordHasher);

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    expect(result.success).toBe(true);
    const user = await userRepo.findById(UserId.create(result.userId));
    expect(user).not.toBeNull();
  });
});
```

```typescript
// ❌ WRONG: Heavy mocking
import { mock } from 'jest-mock-extended';

describe('RegisterUserUseCase', () => {
  it('should register a new user', async () => {
    const userRepo = mock<UserRepository>(); // ❌ Mock framework
    userRepo.findByEmail.mockResolvedValue(null); // ❌ Mock setup
    userRepo.save.mockResolvedValue(undefined); // ❌ Mock setup

    // Test becomes brittle and couples to implementation details
  });
});
```

### Unit Test Principles

1. **Fast**: Aim for <50 ms for a small unit; investigate feedback cost instead of imposing a universal deadline
2. **Isolated**: No database, no network, no filesystem
3. **Pure**: Test domain logic with pure functions and test doubles
4. **Focused**: Assert one cohesive behavior with as many independent assertions as that behavior needs

```typescript
// domain/entities/user.test.ts
describe('User', () => {
  describe('canAccessFeature', () => {
    it('should allow access when user is active and has permission', () => {
      const user = User.create({
        id: UserId.create('1'),
        email: Email.create('test@example.com'),
        profile: UserProfile.create({ tier: 'premium' }),
        status: UserStatus.active(),
      });

      const canAccess = user.canAccessFeature(Feature.ADVANCED_ANALYTICS);

      expect(canAccess).toBe(true);
    });

    it('should deny access when user is inactive', () => {
      const user = User.create({
        id: UserId.create('1'),
        email: Email.create('test@example.com'),
        profile: UserProfile.create({ tier: 'premium' }),
        status: UserStatus.suspended(),
      });

      const canAccess = user.canAccessFeature(Feature.ADVANCED_ANALYTICS);

      expect(canAccess).toBe(false);
    });
  });
});
```

### Integration Test Principles

Test real adapters at database, API and filesystem boundaries in owned isolated fixtures. Inject deterministic transports for offline provider tests. A fake use case alone cannot prove a production adapter or provider quality.

Package acceptance imports or executes the actual installed archive from outside the workspace, checks public/runtime exports, and exercises a real source consumer. Workspace links and tests of copied implementation logic do not prove distribution. Use independently known expectations for successful results and consequential failures.

```typescript
// infrastructure/repositories/prisma-user-repository.integration.test.ts
import { PrismaClient } from '@prisma/client';

describe('PrismaUserRepository (integration)', () => {
  let prisma: PrismaClient;
  let repo: PrismaUserRepository;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany(); // Clean slate
    repo = new PrismaUserRepository(prisma);
  });

  it('should save and retrieve a user', async () => {
    const user = User.create({
      id: UserId.create('1'),
      email: Email.create('test@example.com'),
      profile: UserProfile.create({ name: 'Test' }),
    });

    await repo.save(user);
    const retrieved = await repo.findById(user.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.email.value).toBe('test@example.com');
  });
});
```

---

## Error Handling

### Custom Domain Errors

Domain may define invariant errors; application owns workflow failure contracts. Return typed expected failures when callers must branch on them. Reserve exceptions for unexpected failures or a deliberate local convention. The following legacy-style registration examples illustrate the exception convention; adapters must map and redact those errors before transport.

```typescript
// domain/errors/user-errors.ts
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

export class InvalidEmailError extends UserError {
  constructor(email: string) {
    super('Invalid email');
    this.name = 'InvalidEmailError';
  }
}

export class UserNotFoundError extends UserError {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
    this.name = 'UserNotFoundError';
  }
}

export class UserAlreadyExistsError extends UserError {
  constructor(email: Email) {
    super('User already exists');
    this.name = 'UserAlreadyExistsError';
  }
}
```

### Error Propagation: Push Upward

Use cases return expected outcomes or throw under their declared convention; infrastructure maps them to transport status and safe messages. Core code must not catch a failure merely to hide it. Provider-backed operation contracts distinguish cancellation, timeout, invalid input, authentication, rate limit, malformed output and unavailability. Authors need no universal Result package.

```typescript
// ✅ CORRECT: Use-case throws domain errors
export class RegisterUserUseCase {
  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const email = Email.create(input.email); // May throw InvalidEmailError

    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new UserAlreadyExistsError(email); // ✅ Throw domain error
    }

    const user = User.create({ email, ... });
    await this.userRepo.save(user);

    return { userId: user.id.value, success: true };
  }
}

// Infrastructure layer (API route) handles errors
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = RegisterRequestSchema.parse(body);
    const result = await auth.registerUser.execute(input);
    return Response.json(result);
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) {
      return Response.json({ error: 'User already exists' }, { status: 409 });
    }
    if (error instanceof InvalidEmailError) {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }
    // Unknown error
    errorReporter.report({ operation: 'registerUser', code: 'unexpected' });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Typed Expected Outcomes

```typescript
export type GenerationFailure =
  | 'cancelled' | 'timeout' | 'invalid-input' | 'authentication'
  | 'rate-limit' | 'malformed-output' | 'unavailable';

export type GenerationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: GenerationFailure };
```

An adapter translates provider errors into these operation-owned outcomes. It keeps credentials, raw provider payloads and source text out of public errors and logs. A caller can distinguish cancellation from timeout without inspecting a vendor exception.

### No Swallowing Errors in Core Logic

```typescript
// ❌ WRONG: Swallowing errors in use-case
export class RegisterUserUseCase {
  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    try {
      const user = User.create({ ... });
      await this.userRepo.save(user);
      return { success: true };
    } catch (error) {
      console.error(error); // ❌ Swallowed
      return { success: false }; // ❌ Caller doesn't know what happened
    }
  }
}

// ✅ CORRECT: Let errors bubble up
export class RegisterUserUseCase {
  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const user = User.create({ ... }); // May throw
    await this.userRepo.save(user); // May throw
    return { success: true }; // Only reached if successful
  }
}
```

### Logging Strategy

Logging adapters own side effects. An application may consume an injected `ErrorReporter` interface, while composition owns its sink, credentials and redaction policy. Never log raw provider errors, credentials or private source text.

```typescript
// ❌ WRONG: Logging in domain
export class User {
  activate(): void {
    console.log('Activating user:', this.id); // ❌ Side effect in domain
    this.status = 'active';
  }
}

// ✅ CORRECT: Logging in infrastructure
export async function POST(request: Request) {
  try {
    const input = RegisterRequestSchema.parse(body);
    const result = await auth.registerUser.execute(input);
    console.log('User registered:', result.userId); // ✅ Log in infrastructure
    return Response.json(result);
  } catch (error) {
    errorReporter.report({ operation: 'registerUser', code: 'unexpected' });
    throw error;
  }
}
```

---

## Code Style & Patterns

### Functional Programming Bias

**Prefer pure functions for domain logic.**

```typescript
// ✅ CORRECT: Pure functions
export function calculateDiscount(price: Money, tier: UserTier): Money {
  const discountRate = getDiscountRate(tier);
  return price.multiply(1 - discountRate);
}

export function isEligibleForRefund(order: Order, now: Date): boolean {
  const daysSincePurchase = differenceInDays(now, order.purchasedAt);
  return daysSincePurchase <= 30 && order.status === 'completed';
}

// ❌ WRONG: Impure, mutating
export function applyDiscount(order: Order, tier: UserTier): void {
  const discount = getDiscountRate(tier);
  order.total = order.total * (1 - discount); // ❌ Mutation
  order.discountApplied = true; // ❌ Mutation
}
```

### Immutability

Keep core inputs and shared state immutable. Use `const`, readonly records and copy-on-write updates. An entity may expose an explicit transition, but a pure transition returns a new value. Adapters and owned state containers may mutate their own state; they must not mutate caller-owned data. Inject time and IDs where rules depend on them.

```typescript
// ✅ CORRECT: Immutable updates
export class User {
  constructor(
    public readonly id: UserId,
    public readonly email: Email,
    private readonly preferences: UserPreferences
  ) {}

  updatePreferences(newPrefs: Partial<UserPreferences>): User {
    return new User(
      this.id,
      this.email,
      { ...this.preferences, ...newPrefs } // ✅ Spread, no mutation
    );
  }
}

// ❌ WRONG: Mutation
export class User {
  updatePreferences(newPrefs: Partial<UserPreferences>): void {
    Object.assign(this.preferences, newPrefs); // ❌ Mutates
  }
}
```

### Declarative Over Imperative

```typescript
// ✅ CORRECT: Declarative
const activeUsers = users.filter(user => user.isActive());
const userNames = activeUsers.map(user => user.name);
const sortedNames = [...userNames].sort();

// ❌ WRONG: Imperative
const activeUsers = [];
for (let i = 0; i < users.length; i++) {
  if (users[i].status === 'active') {
    activeUsers.push(users[i]);
  }
}
const userNames = [];
for (let i = 0; i < activeUsers.length; i++) {
  userNames.push(activeUsers[i].name);
}
userNames.sort();
```

### Async/Await Patterns

**Default: Use `async/await` for control flow.**

```typescript
// ✅ CORRECT: async/await for control flow
export class RegisterUserUseCase {
  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const email = Email.create(input.email);
    const existing = await this.userRepo.findByEmail(email);

    if (existing) {
      throw new UserAlreadyExistsError(email);
    }

    const user = User.create({ email, ... });
    await this.userRepo.save(user);
    await this.emailService.sendWelcomeEmail(user);

    return { userId: user.id.value, success: true };
  }
}

// ✅ CORRECT: Parallelize when possible
export class GetUserDashboardUseCase {
  async execute(userId: UserId): Promise<DashboardData> {
    const [user, orders, notifications] = await Promise.all([
      this.userRepo.findById(userId),
      this.orderRepo.findByUserId(userId),
      this.notificationRepo.findByUserId(userId),
    ]);

    return { user, orders, notifications };
  }
}
```

### Comments: Principle-Based

**Comment *why*, not *what*. Focus on business rules and non-obvious decisions.**

```typescript
// ✅ GOOD: Explains business rule
export class Invoice {
  calculateTotal(): Money {
    // Domain rule: Invoices over $1000 get automatic 5% enterprise discount
    if (this.subtotal.greaterThan(Money.dollars(1000))) {
      return this.subtotal.multiply(0.95);
    }
    return this.subtotal;
  }

  // Performance: Memoize to avoid recalculating on every render
  @memoize
  getLineItems(): LineItem[] {
    return this.items.map(item => this.calculateLineItem(item));
  }
}

// ❌ BAD: Comments the obvious
export class User {
  // Get the user's email
  getEmail(): Email {
    return this.email; // Return the email
  }
}
```

---

## Next.js Integration

### Layer Mapping

| Next.js Concept | Clean Architecture Layer | Purpose |
|-----------------|--------------------------|---------|
| `app/*/page.tsx` | Infrastructure (UI) | Framework component |
| `app/*/route.ts` | Infrastructure (Handler) | HTTP entrypoint |
| Server Actions | Infrastructure (Handler) | Form submission entrypoint |
| `components/*.tsx` | Infrastructure (UI) | React components |
| `hooks/use*.ts` | Infrastructure (UI) | UI state management |
| Middleware | Infrastructure | Request interceptor |
| Server Components | Infrastructure (UI) | Default rendering mode |
| Client Components | Infrastructure (UI) | Browser APIs, state |

### UI Layer Organization

Capability-local `components/` and `hooks/` keep UI beside its owner. A `presentation.ts` public entry exposes React-only exports; `shared/ui/` owns common primitives. The module's portable `index.ts` never reexports React or server wiring.

```text
src/modules/auth/
├── index.ts                  # Portable operations and DTO types
├── presentation.ts           # RegisterForm and UI controller exports
├── components/register-form.tsx
├── hooks/use-registration.ts
└── api/composition.ts        # Server wiring; never import in browser code
```

### API Routes Must Call Use-Cases

API routes decode input, invoke composed operations and map outcomes. They keep workflow rules out of the handler. The snippets below assume that composition provides `auth`, configuration validation provides `env`, and the transport owns `RegisterRequestSchema`; these excerpts illustrate boundaries rather than a complete application.

```typescript
// ✅ CORRECT: Route calls use-case
// app/api/auth/register/route.ts
import { createAuthCompositionRoot } from '@/modules/auth/api/composition';
import { RegisterRequestSchema } from '@/modules/auth/api/register-request';
import { prisma } from '@/infrastructure/prisma';
import { env } from '@/config/env';

export async function POST(request: Request) {
  const auth = createAuthCompositionRoot({
    prisma,
    resendApiKey: env.RESEND_API_KEY,
  });

  try {
    const body = await request.json();
    const input = RegisterRequestSchema.parse(body);
    const result = await auth.registerUser.execute(input); // ✅ Calls use-case
    return Response.json(result);
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) {
      return Response.json({ error: 'User already exists' }, { status: 409 });
    }
    throw error;
  }
}
```

```typescript
// ❌ WRONG: Route has business logic
// app/api/auth/register/route.ts
import { prisma } from '@/infrastructure/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  const body = await request.json();

  // ❌ Business logic in route handler
  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existing) {
    return Response.json({ error: 'User exists' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      password: hashedPassword,
      name: body.name,
    },
  });

  return Response.json({ userId: user.id });
}
```

### Server Actions Pattern

```typescript
// app/actions/auth-actions.ts
'use server';

import { createAuthCompositionRoot } from '@/modules/auth/api/composition';
import { RegisterRequestSchema } from '@/modules/auth/api/register-request';
import { prisma } from '@/infrastructure/prisma';
import { env } from '@/config/env';

export async function registerUserAction(formData: FormData) {
  const auth = createAuthCompositionRoot({
    prisma,
    resendApiKey: env.RESEND_API_KEY,
  });

  try {
    const input = RegisterRequestSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
      name: formData.get('name'),
    });
    const result = await auth.registerUser.execute(input);

    return { success: true, userId: result.userId };
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) {
      return { success: false, error: 'User already exists' };
    }
    return { success: false, error: 'Registration failed' };
  }
}
```

### React Components Are UI Layer

Presentation leaves render finished view models and emit intents. Hooks/controllers coordinate UI state and consume composed operation interfaces. Browser-local operations may run through browser composition; server-only operations cross a transport adapter. UI may share safe DTO types, but components must not construct repositories or acquire concrete infrastructure.

```typescript
// ✅ CORRECT: Component uses server action (infrastructure)
'use client';

import { registerUserAction } from '@/app/actions/auth-actions';
import { Button, Input } from '@/shared/ui';

export function RegisterForm() {
  async function handleSubmit(formData: FormData) {
    const result = await registerUserAction(formData);

    if (result.success) {
      // Handle success
    } else {
      // Handle error
    }
  }

  return (
    <form action={handleSubmit}>
      <Input name="email" type="email" />
      <Input name="password" type="password" />
      <Input name="name" type="text" />
      <Button type="submit">Register</Button>
    </form>
  );
}
```

```typescript
// ❌ WRONG: Component constructs a use case and acquires dependencies
'use client';

import { RegisterUserUseCase } from '@/modules/auth'; // ❌

export function RegisterForm() {
  const registerUseCase = new RegisterUserUseCase(/* ... */); // ❌

  async function handleSubmit(formData: FormData) {
    await registerUseCase.execute({ ... }); // ❌
  }
}
```

### Controller and Presentation Leaf

A browser controller may consume an already composed operation. The leaf receives only finished state and an intent callback; neither constructs a repository.

```tsx
interface RegistrationViewModel {
  readonly canSubmit: boolean;
  readonly message: string;
}

interface RegisterButtonProps {
  readonly view: RegistrationViewModel;
  readonly onRegister: () => void;
}

export function RegisterButton({ view, onRegister }: RegisterButtonProps) {
  return (
    <button disabled={!view.canSubmit} onClick={onRegister}>
      {view.message}
    </button>
  );
}
```

The owning hook/controller maps operation outcomes into `RegistrationViewModel` and passes `onRegister`. A server-only operation crosses the server-action or HTTP adapter; browser-local composition may supply a local operation without that transport.

### State Management

Choose hooks or a state store such as Zustand from UI complexity. Keep persistent authority in the application/repository; a client store mirrors state rather than owning a second persistence truth. No product must adopt Zustand or a common persistence backend merely to follow this guide.

```typescript
// modules/auth/hooks/use-auth.ts
import { create } from 'zustand';

interface AuthState {
  user: UserViewModel | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email, password) => {
    // Call server action or API route
    const result = await loginAction(email, password);
    set({ user: result.user, isAuthenticated: true });
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },
}));

// Usage in component
import { useAuth } from '@/modules/auth/presentation';

export function UserMenu() {
  const { user, logout } = useAuth();

  return (
    <div>
      <span>{user?.name}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Public and Runtime Entry Points

Cross-module callers use declared public APIs. Internal owners may use relative imports without creating a barrel for every directory.

```typescript
// Portable contracts: no React, database or provider acquisition at the root.
import type { RegisterUserInput } from '@/modules/auth';
// UI-only exports.
import { RegisterForm } from '@/modules/auth/presentation';
// Explicit server composition, only from server transport.
import { createAuthCompositionRoot } from '@/modules/auth/api/composition';
import { RegisterRequestSchema } from '@/modules/auth/api/register-request';
// A package may expose a reviewed Node-only adapter subpath.
import { createFileSnapshotReader } from '@twelveapart/arch-check/node';

// Inside the auth owner, private relative imports remain legitimate.
import { Email } from '../domain/value-objects/email';
```

### Other Platform Mappings

| Platform | Outer boundary | Shared inner contract |
|----------|----------------|-----------------------|
| Next.js | Routes, server actions and React controllers | Named operations and DTOs |
| TanStack Start | Server functions, routes and React controllers | The same operation/interface conventions |
| Bun/Node CLI | Argument decoder, command handler and composition | Workflow and repository snapshot interfaces |
| Browser-local capability | Hook/controller and browser composition | Runtime-neutral rules and explicit operations |

Keep each package's runtime requirement explicit. Bun workspaces and tooling do not imply that every native dependency or product runtime supports Bun. Products keep framework, database and deployment choices that serve their actual lifecycle.

---

## Common Patterns

### Repository Pattern

```typescript
// Application-owned workflow IO interface
export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: UserId): Promise<void>;
}

// Prisma implementation
export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: UserId): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id: id.value },
    });
    return record ? UserMapper.toDomain(record) : null;
  }

  async save(user: User): Promise<void> {
    const data = UserMapper.toPersistence(user);
    await this.prisma.user.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }
}

// In-memory implementation (for testing)
export class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();

  async findById(id: UserId): Promise<User | null> {
    return this.users.get(id.value) || null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id.value, user);
  }

  // Test helper
  clear(): void {
    this.users.clear();
  }
}
```

### Mapper Pattern

**Anti-corruption layer between infrastructure and domain.**

```typescript
// infrastructure/mappers/user-mapper.ts
import { User as PrismaUser } from '@prisma/client';
import { User } from '../../domain/entities/user';
import { UserId } from '../../domain/value-objects/user-id';
import { Email } from '../../domain/value-objects/email';

export class UserMapper {
  static toDomain(raw: PrismaUser): User {
    return User.create({
      id: UserId.create(raw.id),
      email: Email.create(raw.email),
      profile: UserProfile.create({
        name: raw.name,
        tier: UserTierSchema.parse(raw.tier),
      }),
      status: UserStatusSchema.parse(raw.status),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(user: User): PrismaUserCreateInput {
    return {
      id: user.id.value,
      email: user.email.value,
      name: user.profile.name,
      tier: user.profile.tier,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
```

### Use Case Pattern

```typescript
// Class form; functions follow the same operation contract and ownership rules
export interface <Verb><Noun>Input {
  // Input fields
}

export interface <Verb><Noun>Output {
  // Output fields
}

export class <Verb><Noun>UseCase {
  constructor(
    private repo: Repository,
    private service: Service
  ) {}

  async execute(input: <Verb><Noun>Input): Promise<<Verb><Noun>Output> {
    // 1. Validate & create value objects
    // 2. Fetch entities from repositories
    // 3. Apply business rules
    // 4. Persist changes
    // 5. Trigger side effects (emails, events)
    // 6. Return output
  }
}
```

### Value Object Pattern

```typescript
export class Email {
  private constructor(public readonly value: string) {}

  static create(value: string): Email {
    const normalized = value.trim().toLowerCase();
    if (!this.isValid(normalized)) {
      throw new InvalidEmailError(value);
    }
    return new Email(normalized);
  }

  private static isValid(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) && value.length <= 255;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
```

### Entity Pattern

A pure transition returns a new entity. Composition supplies time and IDs; restoration uses persisted values rather than reading the clock again.

```typescript
export type UserStatus = 'active' | 'suspended';

export interface CreateUserProps {
  readonly id: UserId;
  readonly email: Email;
  readonly status: UserStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class User {
  private constructor(private readonly props: CreateUserProps) {}

  static create(props: CreateUserProps): User {
    if (props.updatedAt.getTime() < props.createdAt.getTime()) {
      throw new Error('Update time precedes creation time');
    }
    // Copy caller-owned dates; readonly alone cannot freeze a Date instance.
    return new User({
      ...props,
      createdAt: new Date(props.createdAt.getTime()),
      updatedAt: new Date(props.updatedAt.getTime()),
    });
  }

  activate(now: Date): User {
    return User.create({ ...this.props, status: 'active', updatedAt: now });
  }

  suspend(now: Date): User {
    return User.create({ ...this.props, status: 'suspended', updatedAt: now });
  }
}
```

### Transaction Pattern

A use case defines the atomic boundary. An application-owned interface exposes only the persistence operations that boundary needs; the adapter owns the database mechanism. Do not cast a transaction client into a full client or imply atomicity across independent repositories. Keep email/provider effects outside retryable database callbacks; use a product-owned outbox when delivery must survive a process failure.

```typescript
// application/credit-transfer.ts
export interface CreditAccounts {
  findById(id: string): Promise<CreditAccount | null>;
  save(account: CreditAccount): Promise<void>;
}

export interface CreditTransaction {
  withAccounts<T>(work: (accounts: CreditAccounts) => Promise<T>): Promise<T>;
}

export async function transferCredits(
  input: TransferCreditsInput,
  transaction: CreditTransaction
): Promise<void> {
  await transaction.withAccounts(async (accounts) => {
    const sender = await accounts.findById(input.senderId);
    const receiver = await accounts.findById(input.receiverId);
    if (!sender || !receiver) throw new Error('Account not found');
    // Product rules reject invalid amounts and self-transfers, then return new values.
    const transfer = calculateCreditTransfer(sender, receiver, input.amount);
    await accounts.save(transfer.sender);
    await accounts.save(transfer.receiver);
  });
}

// infrastructure/prisma-credit-transaction.ts
import type { Prisma, PrismaClient } from '@prisma/client';

type CreditStore = Pick<Prisma.TransactionClient, 'creditAccount'>;

export class PrismaCreditTransaction implements CreditTransaction {
  constructor(private readonly prisma: PrismaClient) {}

  async withAccounts<T>(work: (accounts: CreditAccounts) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // The adapter accepts only the delegate it needs, not a full PrismaClient.
      const store: CreditStore = tx;
      return work(createPrismaCreditAccounts(store));
    }, { isolationLevel: 'Serializable' });
  }
}
```

The adapter maps records and preserves the product's isolation/conflict policy. If it retries a serialization conflict, it retries the whole callback with a bounded policy. The callback must not send an email or make a provider request.

---

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
