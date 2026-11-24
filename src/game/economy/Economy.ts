export type EconomyReason = "mission" | "property";

export interface LedgerEntry {
  id: string;
  amount: number;
  reason: EconomyReason;
  balanceAfter: number;
  at: string;
}

export class Economy {
  cash: number;
  readonly entries: LedgerEntry[] = [];

  constructor(cash: number) {
    this.cash = cash;
  }

  canAfford(amount: number): boolean {
    return this.cash >= amount;
  }

  credit(amount: number, reason: EconomyReason): LedgerEntry {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error("Credit amount must be a positive integer.");
    }
    this.cash += amount;
    return this.push(amount, reason);
  }

  debit(amount: number, reason: EconomyReason): LedgerEntry | null {
    if (!Number.isInteger(amount) || amount <= 0) return null;
    if (this.cash < amount) return null;
    this.cash -= amount;
    return this.push(-amount, reason);
  }

  private push(amount: number, reason: EconomyReason): LedgerEntry {
    const entry: LedgerEntry = {
      id: createId(),
      amount,
      reason,
      balanceAfter: this.cash,
      at: new Date().toISOString(),
    };
    this.entries.push(entry);
    return entry;
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
