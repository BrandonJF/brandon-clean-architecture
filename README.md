# Clean Architecture Guide - Brandon's Opinionated Principles

> **Purpose**: A definitive guide to my clean architecture style, optimized for TypeScript/Next.js projects with strong functional programming bias, SOLID principles, and pragmatic developer ergonomics.

**Last Updated**: 2025-12-09
**Status**: Canonical Reference
**Target Audience**: Claude Code agents, team members, future self

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

---

## Philosophy & Core Principles

### What I Value

1. **Domain Isolation** - Business rules are pure, reusable, and independent of frameworks
2. **Simple Vocabulary** - Clear, descriptive naming over jargon
3. **Dependency Inversion** - Abstractions over concretions at every boundary
4. **Declarative Over Imperative** - Express *what*, not *how*
5. **Fast Tests** - Domain/use-case tests run in <50ms each
6. **Developer Ergonomics** - Easy to navigate, understand, and modify
7. **Zero Framework Coupling in Core** - Business logic never imports from frameworks

### What I Avoid

- ❌ Heavy hexagonal architecture jargon ("ports", "gateways", "presenters" as type names)
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
- **Classes** for entities with behavior and use-cases with dependencies
- **Interfaces** for all architectural boundaries
- **Explicit composition** over DI containers (type safety + simplicity)
- **Immutability by default** (`const`, spread operators, no mutations)
- **Push errors upward** - don't catch too early

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
│   - Repository Interfaces               │
│   - Service Interfaces                  │
└─────────────────────────────────────────┘
```

### Layer Rules

#### Domain Layer (Innermost)
**Responsibilities:**
- Pure business logic and rules
- Rich entities with behavior
- Value objects (immutable, validated types)
- Repository interfaces (contracts)
- Service interfaces (e.g., `Llm`, `EmailService`)

**Import Rules:**
- ✅ Can import: Other domain types only
- ❌ Cannot import: Application, Infrastructure, Frameworks

**Examples:**
```typescript
// domain/entities/user.ts
export class User {
  private constructor(
    public readonly id: UserId,
    public readonly email: Email,
    public readonly profile: UserProfile,
    private status: UserStatus
  ) {}

  static create(props: CreateUserProps): User {
    // Validate invariants
    if (!props.email.isValid()) {
      throw new InvalidEmailError(props.email.value);
    }
    return new User(/* ... */);
  }

  activate(): void {
    if (this.status.isActive()) {
      throw new UserAlreadyActiveError(this.id);
    }
    this.status = UserStatus.active();
  }

  // Domain rule: business logic method
  canAccessFeature(feature: Feature): boolean {
    return this.profile.tier.includes(feature) && this.status.isActive();
  }
}

// domain/repositories/user-repository.ts
export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
  findByEmail(email: Email): Promise<User | null>;
}

// domain/services/email-service.ts
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

**Import Rules:**
- ✅ Can import: Domain (entities, interfaces, value objects)
- ❌ Cannot import: Infrastructure, Frameworks

**Examples:**
```typescript
// application/use-cases/register-user/register-user-use-case.ts
export interface RegisterUserInput {
  email: string;
  password: string;
  name: string;
}

export interface RegisterUserOutput {
  userId: string;
  success: boolean;
}

export class RegisterUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService,
    private passwordHasher: PasswordHasher
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    // 1. Create value objects
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

### Feature-Based Organization (Preferred)

Organize by **feature first**, then **layer within feature**:

```
src/
├── features/                          # Feature modules
│   ├── auth/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── user.ts
│   │   │   │   └── index.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── email.ts
│   │   │   │   ├── user-id.ts
│   │   │   │   └── index.ts
│   │   │   ├── repositories/
│   │   │   │   ├── user-repository.ts
│   │   │   │   └── index.ts
│   │   │   ├── services/
│   │   │   │   ├── email-service.ts
│   │   │   │   └── index.ts
│   │   │   ├── errors/
│   │   │   │   ├── user-errors.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts               # Barrel export
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── register-user/
│   │   │   │   │   ├── register-user-use-case.ts
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── login/
│   │   │   │   │   ├── login-use-case.ts
│   │   │   │   │   ├── types.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   │   ├── prisma-user-repository.ts
│   │   │   │   ├── in-memory-user-repository.ts
│   │   │   │   └── index.ts
│   │   │   ├── services/
│   │   │   │   ├── resend-email-service.ts
│   │   │   │   ├── fake-email-service.ts
│   │   │   │   └── index.ts
│   │   │   ├── mappers/
│   │   │   │   ├── user-mapper.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── composition-root.ts        # DI wiring for this feature
│   │   └── index.ts                   # Feature public API
│   │
│   ├── billing/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   ├── composition-root.ts
│   │   └── index.ts
│   │
│   └── analytics/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       ├── composition-root.ts
│       └── index.ts
│
├── ui/                                # UI layer (Next.js specific)
│   ├── components/
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   └── index.ts
│   │   ├── shared/
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-user.ts
│   │   └── index.ts
│   └── index.ts
│
├── app/                               # Next.js app directory
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── api/
│   │   └── auth/
│   │       └── register/
│   │           └── route.ts
│   └── layout.tsx
│
├── core/                              # Cross-cutting concerns
│   ├── errors/
│   │   ├── base-error.ts
│   │   ├── domain-error.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── common.ts
│   │   └── index.ts
│   └── utils/
│       ├── date.ts
│       ├── string.ts
│       └── index.ts
│
└── config/
    ├── env.ts
    └── constants.ts
```

### Key Principles

1. **Feature folders contain all layers** - `features/{feature}/{domain,application,infrastructure}`
2. **Barrel exports everywhere** - Every directory has `index.ts`
3. **Types in separate files** - `types.ts` for clarity, co-located with implementation
4. **UI separated** - `ui/` folder for React components, hooks
5. **App is infrastructure** - Next.js `app/` directory is framework layer
6. **Shared concerns in `core/`** - Not `lib/`, not `shared/`, use `core/` sparingly

---

## Naming Conventions

### Files

| Type | Pattern | Examples |
|------|---------|----------|
| **Use Case** | `<verb>-<noun>-use-case.ts` | `register-user-use-case.ts`, `calculate-invoice-use-case.ts` |
| **Entity** | `<noun>.ts` | `user.ts`, `invoice.ts`, `subscription.ts` |
| **Value Object** | `<noun>.ts` | `email.ts`, `user-id.ts`, `money.ts` |
| **Repository Interface** | `<noun>-repository.ts` | `user-repository.ts`, `order-repository.ts` |
| **Repository Impl** | `<source>-<noun>-repository.ts` | `prisma-user-repository.ts`, `in-memory-user-repository.ts` |
| **Service Interface** | `<noun>-service.ts` | `email-service.ts`, `payment-service.ts` |
| **Service Impl** | `<provider>-<noun>-service.ts` | `resend-email-service.ts`, `stripe-payment-service.ts` |
| **Mapper** | `<noun>-mapper.ts` | `user-mapper.ts`, `invoice-mapper.ts` |
| **Test Double** | `fake-<noun>.ts` or `in-memory-<noun>.ts` | `fake-email-service.ts`, `in-memory-user-repository.ts` |
| **Types** | `types.ts` | Co-located with implementation |
| **Errors** | `<domain>-errors.ts` | `user-errors.ts`, `auth-errors.ts` |
| **Component** | `<noun>.tsx` or `<noun>-<type>.tsx` | `button.tsx`, `login-form.tsx` |
| **Hook** | `use-<noun>.ts` | `use-auth.ts`, `use-user-data.ts` |
| **Barrel Export** | `index.ts` | Every directory |

### Classes & Interfaces

| Type | Pattern | Examples |
|------|---------|----------|
| **Use Case** | `<Verb><Noun>UseCase` | `RegisterUserUseCase`, `CalculateInvoiceUseCase` |
| **Entity** | `<Noun>` | `User`, `Invoice`, `Subscription` |
| **Value Object** | `<Noun>` | `Email`, `UserId`, `Money` |
| **Repository** | `<Noun>Repository` (interface) | `UserRepository`, `OrderRepository` |
| **Repository Impl** | `<Source><Noun>Repository` | `PrismaUserRepository`, `InMemoryUserRepository` |
| **Service** | `<Noun>Service` (interface) | `EmailService`, `PaymentService` |
| **Service Impl** | `<Provider><Noun>Service` | `ResendEmailService`, `StripePaymentService` |
| **Error** | `<Noun>Error` | `InvalidEmailError`, `UserNotFoundError` |
| **Mapper** | `<Noun>Mapper` | `UserMapper`, `InvoiceMapper` |
| **Config** | `<Noun>Config` | `EmailConfig`, `DatabaseConfig` |

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

#### Pattern: Interface in Domain, Implementation in Infrastructure

```typescript
// ✅ CORRECT
// domain/repositories/user-repository.ts
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

### Constructor Injection

**All dependencies must be injected via constructor parameters.**

```typescript
// ✅ CORRECT: Dependencies injected
export class RegisterUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService,
    private passwordHasher: PasswordHasher
  ) {}
}

// ❌ WRONG: Dependencies created inside class
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

### Composition Root Pattern

**Single location per feature where all dependencies are wired together.**

```typescript
// features/auth/composition-root.ts
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { RegisterUserUseCase } from './application';
import { PrismaUserRepository, ResendEmailService } from './infrastructure';
import { BCryptPasswordHasher } from './infrastructure/services/bcrypt-password-hasher';

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

  // Return use cases (public API)
  return {
    registerUser: registerUserUseCase,
    login: loginUseCase,
  };
}

// Usage in Next.js API route
// app/api/auth/register/route.ts
import { createAuthCompositionRoot } from '@/features/auth/composition-root';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const auth = createAuthCompositionRoot({
    prisma,
    resendApiKey: process.env.RESEND_API_KEY!,
  });

  const body = await request.json();
  const result = await auth.registerUser.execute(body);

  return Response.json(result);
}
```

### Test Composition Root

```typescript
// features/auth/composition-root.test.ts
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
- Object shapes that might be extended
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
- Use-cases (application services)
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
    private status: UserStatus
  ) {}

  activate(): void {
    this.status = 'active';
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
  email: string;
  password: string;
}
```

### Type-Only Files

**Keep types in separate `types.ts` files for clarity.**

```typescript
// features/auth/application/use-cases/register-user/types.ts
export interface RegisterUserInput {
  email: string;
  password: string;
  name: string;
}

export interface RegisterUserOutput {
  userId: string;
  success: boolean;
}

// features/auth/application/use-cases/register-user/register-user-use-case.ts
import { RegisterUserInput, RegisterUserOutput } from './types';

export class RegisterUserUseCase {
  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    // ...
  }
}

// features/auth/application/use-cases/register-user/index.ts
export { RegisterUserUseCase } from './register-user-use-case';
export type { RegisterUserInput, RegisterUserOutput } from './types';
```

### Zod Validation

**Use Zod for:**
- Runtime validation at boundaries (API routes, form inputs)
- Domain value object validation
- External data validation (API responses)

**Location:**
- Domain validation schemas → `domain/schemas/`
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

// app/api/auth/register/route.ts
import { z } from 'zod';

const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const validated = RegisterRequestSchema.parse(body); // Throws if invalid

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

### Testing Pyramid

```
        ┌─────────────┐
        │   E2E (5%)  │  Playwright, user flows
        ├─────────────┤
        │ Integration │  API routes, DB, external services
        │    (25%)    │
        ├─────────────┤
        │    Unit     │  Domain, use-cases, pure functions
        │    (70%)    │  <50ms each
        └─────────────┘
```

### Test Organization

**Co-locate tests within architectural layers:**

```
features/auth/
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
    const useCase = new RegisterUserUseCase(userRepo, emailService);

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

1. **Fast**: <50ms per test
2. **Isolated**: No database, no network, no filesystem
3. **Pure**: Test domain logic with pure functions and test doubles
4. **Focused**: One assertion per test (generally)

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

**Test real integrations: databases, APIs, file systems**

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

**Define custom error classes in domain layer.**

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
    super(`Invalid email: ${email}`);
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
    super(`User already exists with email: ${email.value}`);
    this.name = 'UserAlreadyExistsError';
  }
}
```

### Error Propagation: Push Upward

**Domain/use-cases throw errors. Infrastructure handles them.**

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
    const result = await auth.registerUser.execute(body);
    return Response.json(result);
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof InvalidEmailError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    // Unknown error
    console.error('Unexpected error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

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

**Logging is a side effect → belongs in infrastructure.**

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
    const result = await auth.registerUser.execute(body);
    console.log('User registered:', result.userId); // ✅ Log in infrastructure
    return Response.json(result);
  } catch (error) {
    console.error('Registration failed:', error); // ✅ Log in infrastructure
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

**Use `const`, spread operators, no mutations.**

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
const sortedNames = userNames.sort();

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

```
src/
├── ui/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   └── index.ts
│   │   ├── shared/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-form.ts
│   │   └── index.ts
│   └── index.ts
```

### API Routes Must Call Use-Cases

**API routes are thin handlers that delegate to use-cases.**

```typescript
// ✅ CORRECT: Route calls use-case
// app/api/auth/register/route.ts
import { createAuthCompositionRoot } from '@/features/auth/composition-root';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const auth = createAuthCompositionRoot({
    prisma,
    resendApiKey: process.env.RESEND_API_KEY!,
  });

  try {
    const body = await request.json();
    const result = await auth.registerUser.execute(body); // ✅ Calls use-case
    return Response.json(result);
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
```

```typescript
// ❌ WRONG: Route has business logic
// app/api/auth/register/route.ts
import { prisma } from '@/lib/prisma';
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

import { createAuthCompositionRoot } from '@/features/auth/composition-root';
import { prisma } from '@/lib/prisma';

export async function registerUserAction(formData: FormData) {
  const auth = createAuthCompositionRoot({
    prisma,
    resendApiKey: process.env.RESEND_API_KEY!,
  });

  try {
    const result = await auth.registerUser.execute({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      name: formData.get('name') as string,
    });

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

**Components should NOT import domain entities or use-cases directly.**

```typescript
// ✅ CORRECT: Component uses server action (infrastructure)
'use client';

import { registerUserAction } from '@/app/actions/auth-actions';
import { Button, Input } from '@/ui/components/shared';

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
// ❌ WRONG: Component imports use-case directly
'use client';

import { RegisterUserUseCase } from '@/features/auth/application'; // ❌

export function RegisterForm() {
  const registerUseCase = new RegisterUserUseCase(/* ... */); // ❌

  async function handleSubmit(formData: FormData) {
    await registerUseCase.execute({ ... }); // ❌
  }
}
```

### State Management

**For global state: Custom hooks or Zustand when significantly complex.**

```typescript
// ui/hooks/use-auth.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
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
import { useAuth } from '@/ui/hooks';

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

### Barrel Exports for Clean Imports

```typescript
// ✅ CORRECT: Import from barrel exports
import { useUserData } from '@/ui/hooks';
import { Button, Card } from '@/ui/components/shared';
import { LoginForm } from '@/ui/components/auth';
import { RegisterUserUseCase } from '@/features/auth/application';

// ❌ WRONG: Import from deep paths
import { useUserData } from '@/ui/hooks/use-user-data';
import { Button } from '@/ui/components/shared/button';
import { LoginForm } from '@/ui/components/auth/login-form';
import { RegisterUserUseCase } from '@/features/auth/application/use-cases/register-user/register-user-use-case';
```

**Exception: Relative imports within same directory are allowed.**

```typescript
// Within features/auth/domain/entities/
// user.ts
import { Email, UserId } from '../value-objects'; // ✅ Relative import OK
import { UserStatus } from './user-status'; // ✅ Same directory OK
```

---

## Common Patterns

### Repository Pattern

```typescript
// Domain interface
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
import { User, UserId, Email } from '@/features/auth/domain';

export class UserMapper {
  static toDomain(raw: PrismaUser): User {
    return User.create({
      id: UserId.create(raw.id),
      email: Email.create(raw.email),
      profile: UserProfile.create({
        name: raw.name,
        tier: raw.tier as UserTier,
      }),
      status: raw.status as UserStatus,
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
// Consistent structure for all use-cases
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
    if (!this.isValid(value)) {
      throw new InvalidEmailError(value);
    }
    return new Email(value.toLowerCase().trim());
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

```typescript
export class User {
  private constructor(
    public readonly id: UserId,
    public readonly email: Email,
    private status: UserStatus,
    public readonly createdAt: Date,
    private updatedAt: Date
  ) {}

  static create(props: CreateUserProps): User {
    // Validate invariants
    return new User(
      props.id,
      props.email,
      props.status || UserStatus.active(),
      new Date(),
      new Date()
    );
  }

  // Business logic methods
  activate(): void {
    if (this.status === UserStatus.active()) {
      throw new UserAlreadyActiveError(this.id);
    }
    this.status = UserStatus.active();
    this.touch();
  }

  suspend(): void {
    this.status = UserStatus.suspended();
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
```

### Transaction Pattern

**Transactions handled in use-cases, mechanism provided by repositories.**

```typescript
// Domain interface defines transaction capability
export interface UserRepository {
  // ... other methods
  transaction<T>(work: (repo: UserRepository) => Promise<T>): Promise<T>;
}

// Prisma implementation provides mechanism
export class PrismaUserRepository implements UserRepository {
  async transaction<T>(work: (repo: UserRepository) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const txRepo = new PrismaUserRepository(tx as PrismaClient);
      return work(txRepo);
    });
  }
}

// Use-case orchestrates transaction
export class TransferCreditsUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(input: TransferCreditsInput): Promise<TransferCreditsOutput> {
    return this.userRepo.transaction(async (repo) => {
      const sender = await repo.findById(input.senderId);
      const receiver = await repo.findById(input.receiverId);

      if (!sender || !receiver) {
        throw new UserNotFoundError();
      }

      sender.deductCredits(input.amount);
      receiver.addCredits(input.amount);

      await repo.save(sender);
      await repo.save(receiver);

      return { success: true };
    });
  }
}
```

---

## Migration Strategies

### From Messy Codebase to Clean Architecture

**Incremental approach - don't rewrite everything at once.**

#### Phase 1: Extract Domain Logic

1. Identify business rules scattered across codebase
2. Create domain entities and value objects
3. Move business logic into entity methods
4. Keep existing infrastructure as-is

**Example:**
```typescript
// Before: Business logic in API route
export async function POST(request: Request) {
  const body = await request.json();

  // ❌ Business logic here
  if (!body.email.includes('@')) {
    return Response.json({ error: 'Invalid email' });
  }

  const user = await prisma.user.create({ data: body });
  return Response.json(user);
}

// After: Extract to domain
export async function POST(request: Request) {
  const body = await request.json();

  try {
    const email = Email.create(body.email); // ✅ Domain validation
    // ... still using prisma directly, but domain logic extracted
  } catch (error) {
    return Response.json({ error: error.message });
  }
}
```

#### Phase 2: Introduce Repository Interfaces

1. Define repository interfaces in domain
2. Create adapters for existing data access
3. Gradually replace direct DB calls with repository calls

#### Phase 3: Extract Use Cases

1. Identify operations (user registration, order creation, etc.)
2. Create use-case classes
3. Move orchestration logic into use-cases
4. Update routes to call use-cases

#### Phase 4: Complete Clean Architecture

1. Organize into feature folders
2. Add test doubles
3. Complete dependency inversion
4. Full separation of concerns

### Adding Clean Architecture to New Features

**Start clean from day one on new features.**

```typescript
// New feature: Billing
// 1. Create feature folder
features/billing/
├── domain/
│   ├── entities/
│   │   └── invoice.ts
│   ├── repositories/
│   │   └── invoice-repository.ts
│   └── index.ts
├── application/
│   └── use-cases/
│       └── create-invoice/
│           ├── create-invoice-use-case.ts
│           ├── types.ts
│           └── index.ts
├── infrastructure/
│   └── repositories/
│       └── prisma-invoice-repository.ts
├── composition-root.ts
└── index.ts

// 2. Build feature with clean architecture
// 3. Integrate with existing (messy) codebase via composition root
// 4. Gradually refactor old features to match
```

---

## Summary: Quick Reference Checklist

When coding, verify:

### ✅ Layer Rules
- [ ] Domain never imports from application or infrastructure
- [ ] Application only imports from domain
- [ ] Infrastructure can import from anywhere
- [ ] No framework code in domain or application

### ✅ Dependency Inversion
- [ ] Interfaces defined in domain
- [ ] Implementations in infrastructure
- [ ] Use-cases depend on interfaces, not concretions
- [ ] Constructor injection used everywhere

### ✅ Use Cases
- [ ] Every use-case has `execute()` method
- [ ] Explicit `Input` and `Output` types
- [ ] Use-cases orchestrate, don't contain deep business logic
- [ ] Business logic lives in entities/value objects

### ✅ Testing
- [ ] Domain/use-case tests use test doubles, not mocks
- [ ] Tests co-located with implementation
- [ ] Fast unit tests (<50ms)
- [ ] Integration tests for infrastructure

### ✅ Naming & Organization
- [ ] Feature-based folders
- [ ] Barrel exports (`index.ts`) everywhere
- [ ] Descriptive names (no abbreviations)
- [ ] Consistent file naming patterns

### ✅ Next.js Integration
- [ ] Routes/Server Actions call use-cases (not repositories)
- [ ] Components in `ui/` folder
- [ ] No business logic in components
- [ ] State management in custom hooks

### ✅ Code Style
- [ ] Functional programming bias (pure functions)
- [ ] Immutability (`const`, spread operators)
- [ ] Declarative over imperative
- [ ] Principle-based comments
- [ ] Zero `any` types

---

## Appendix: Example Project Structure

**Complete example for reference:**

```
my-next-app/
├── src/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── user.ts
│   │   │   │   │   ├── user.test.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── email.ts
│   │   │   │   │   ├── email.test.ts
│   │   │   │   │   ├── user-id.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── user-repository.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── email-service.ts
│   │   │   │   │   ├── password-hasher.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── errors/
│   │   │   │   │   ├── user-errors.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── application/
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── register-user/
│   │   │   │   │   │   ├── register-user-use-case.ts
│   │   │   │   │   │   ├── register-user-use-case.test.ts
│   │   │   │   │   │   ├── types.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   ├── login/
│   │   │   │   │   │   ├── login-use-case.ts
│   │   │   │   │   │   ├── login-use-case.test.ts
│   │   │   │   │   │   ├── types.ts
│   │   │   │   │   │   └── index.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── prisma-user-repository.ts
│   │   │   │   │   ├── prisma-user-repository.integration.test.ts
│   │   │   │   │   ├── in-memory-user-repository.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── resend-email-service.ts
│   │   │   │   │   ├── bcrypt-password-hasher.ts
│   │   │   │   │   ├── fake-email-service.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── mappers/
│   │   │   │   │   ├── user-mapper.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── composition-root.ts
│   │   │   ├── composition-root.test.ts
│   │   │   └── index.ts
│   │   │
│   │   └── billing/
│   │       ├── domain/
│   │       ├── application/
│   │   ├── infrastructure/
│   │       ├── composition-root.ts
│   │       └── index.ts
│   │
│   ├── ui/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── login-form.tsx
│   │   │   │   ├── register-form.tsx
│   │   │   │   └── index.ts
│   │   │   ├── shared/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   ├── use-form.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── core/
│   │   ├── errors/
│   │   │   ├── base-error.ts
│   │   │   ├── domain-error.ts
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── common.ts
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── date.ts
│   │       ├── string.ts
│   │       └── index.ts
│   │
│   └── config/
│       ├── env.ts
│       └── constants.ts
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── auth/
│   │       ├── register/
│   │       │   └── route.ts
│   │       └── login/
│   │           └── route.ts
│   ├── actions/
│   │   └── auth-actions.ts
│   └── layout.tsx
│
├── prisma/
│   └── schema.prisma
│
├── tests/
│   └── e2e/
│       └── auth.spec.ts
│
├── .env
├── .env.example
├── tsconfig.json
├── next.config.js
└── package.json
```

---

**End of Guide**

*This is a living document. Update as architectural decisions evolve.*
*Always follow clean arch, it's not that much overhead.*

---

**Remember:**
- Domain is pure business logic
- Application orchestrates use-cases
- Infrastructure handles frameworks, APIs, databases
- Always dependency inversion (interfaces over implementations)
- Prefer test doubles over mocks
- Functional programming bias (pure, immutable)
- Feature folders with layers inside
- Barrel exports everywhere
- Next.js routes/actions call use-cases, never repositories directly

**When in doubt:** Ask "Does this violate dependency inversion?" If yes, refactor.
