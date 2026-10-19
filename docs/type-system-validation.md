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

---

## Navigation

← Previous: [Dependency Management](dependency-management.md)

Next: [Testing Strategy](testing-strategy.md) →
