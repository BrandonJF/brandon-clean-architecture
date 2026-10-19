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

---

## Navigation

← Previous: [Error Handling](error-handling.md)

Next: [Next.js Integration](nextjs-integration.md) →
