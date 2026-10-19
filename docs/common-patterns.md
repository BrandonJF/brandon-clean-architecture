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

---

## Navigation

← Previous: [Next.js Integration](nextjs-integration.md)

Next: [Migration Strategies](migration-strategies.md) →
