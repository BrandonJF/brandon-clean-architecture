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

---

## Navigation

← Previous: [Philosophy & Core Principles](philosophy-core-principles.md)

Next: [Directory Structure](directory-structure.md) →
