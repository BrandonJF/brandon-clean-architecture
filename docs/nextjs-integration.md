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

---

## Navigation

← Previous: [Code Style & Patterns](code-style-patterns.md)

Next: [Common Patterns](common-patterns.md) →
