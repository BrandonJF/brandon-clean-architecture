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

---

## Navigation

← Previous: [Testing Strategy](testing-strategy.md)

Next: [Code Style & Patterns](code-style-patterns.md) →
