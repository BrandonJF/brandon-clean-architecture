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

---

## Navigation

← Previous: [Naming Conventions](naming-conventions.md)

Next: [Type System & Validation](type-system-validation.md) →
