/**
 * Typed readers for the fields of an untrusted command object. A reader either returns a value of
 * the declared type within its bounds or throws CommandFieldError naming the field, so a decoder
 * reads like a schema: `{ bid: fields.integer('bid', { min: 0, max: 60 }) }`.
 */

export class CommandFieldError extends Error {
  constructor(readonly field: string, reason: string) {
    super(`${field} ${reason}`);
    this.name = 'CommandFieldError';
  }
}

export type UntrustedRecord = Record<string, unknown>;

/** A JSON object (not null, not an array). */
export function isUntrustedRecord(value: unknown): value is UntrustedRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface StringBounds {
  /** Shortest accepted length (default 1: empty strings are refused). */
  min?: number;
  max: number;
  pattern?: RegExp;
}

interface NumberBounds {
  min: number;
  max: number;
}

/** null and a missing field both mean "not given". */
function isAbsent(value: unknown): value is null | undefined {
  return value === undefined || value === null;
}

export class CommandFields {
  constructor(private readonly source: UntrustedRecord) {}

  string(field: string, bounds: StringBounds): string {
    const value = this.source[field];
    if (typeof value !== 'string') throw new CommandFieldError(field, 'must be text');
    const min = bounds.min ?? 1;
    if (value.length < min || value.length > bounds.max) {
      throw new CommandFieldError(field, `must be ${min} to ${bounds.max} characters`);
    }
    if (bounds.pattern && !bounds.pattern.test(value)) throw new CommandFieldError(field, 'has an invalid format');
    return value;
  }

  optionalString(field: string, bounds: StringBounds): string | undefined {
    return isAbsent(this.source[field]) ? undefined : this.string(field, bounds);
  }

  integer(field: string, bounds: NumberBounds): number {
    const value = this.source[field];
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new CommandFieldError(field, 'must be a whole number');
    }
    if (value < bounds.min || value > bounds.max) {
      throw new CommandFieldError(field, `must be between ${bounds.min} and ${bounds.max}`);
    }
    return value;
  }

  optionalInteger(field: string, bounds: NumberBounds): number | undefined {
    return isAbsent(this.source[field]) ? undefined : this.integer(field, bounds);
  }

  boolean(field: string): boolean {
    const value = this.source[field];
    if (typeof value !== 'boolean') throw new CommandFieldError(field, 'must be true or false');
    return value;
  }

  oneOf<T>(field: string, allowed: readonly T[]): T {
    const value = this.source[field];
    if (!allowed.includes(value as T)) throw new CommandFieldError(field, 'is not an allowed value');
    return value as T;
  }

  /** One of `allowed`, or null when the field is missing or null. */
  nullableOneOf<T>(field: string, allowed: readonly T[]): T | null {
    return isAbsent(this.source[field]) ? null : this.oneOf(field, allowed);
  }

  optionalOneOf<T>(field: string, allowed: readonly T[]): T | undefined {
    return isAbsent(this.source[field]) ? undefined : this.oneOf(field, allowed);
  }

  /** A nested object whose fields the domain normalizes (room settings, a ruleset, a sound). */
  record(field: string): UntrustedRecord {
    const value = this.source[field];
    if (!isUntrustedRecord(value)) throw new CommandFieldError(field, 'must be an object');
    return value;
  }

  optionalRecord(field: string): UntrustedRecord | undefined {
    return isAbsent(this.source[field]) ? undefined : this.record(field);
  }

  /** A nested value parsed by a domain parser that returns null for anything invalid. */
  parsed<T>(field: string, parse: (value: unknown) => T | null): T {
    const value = parse(this.source[field]);
    if (value === null) throw new CommandFieldError(field, 'is not valid');
    return value;
  }

  optionalParsed<T>(field: string, parse: (value: unknown) => T | null): T | undefined {
    return isAbsent(this.source[field]) ? undefined : this.parsed(field, parse);
  }

  /**
   * A cosmetic hint that rides along with a command (e.g. how a card was thrown): kept when
   * `parse` accepts it, dropped otherwise. It never refuses the command it belongs to, so a
   * glitch in a presentation detail cannot cost a player a legal move.
   */
  hint<T>(field: string, parse: (value: unknown) => T | null): T | undefined {
    return isAbsent(this.source[field]) ? undefined : parse(this.source[field]) ?? undefined;
  }
}
