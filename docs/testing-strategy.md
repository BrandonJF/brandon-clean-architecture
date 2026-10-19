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

---

## Navigation

← Previous: [Type System & Validation](type-system-validation.md)

Next: [Error Handling](error-handling.md) →
