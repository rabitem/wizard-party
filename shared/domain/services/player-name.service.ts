/**
 * Player Name Service
 * Single responsibility: Validate and normalize player names for uniqueness checking
 */

export interface NameValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedName?: string;
}

export interface PlayerNameInfo {
  id: string;
  name: string;
}

/**
 * Player name validation domain service - stateless functions for name validation
 */
export class PlayerNameService {
  /** Minimum allowed name length */
  static readonly MIN_LENGTH = 2;

  /** Maximum allowed name length */
  static readonly MAX_LENGTH = 20;

  /**
   * Pattern for allowed characters:
   * - Letters (including Unicode letters like umlauts)
   * - Numbers
   * - Spaces
   * - Hyphens and underscores
   */
  private static readonly ALLOWED_PATTERN = /^[\p{L}\p{N}\s\-_]+$/u;

  /**
   * Validate and sanitize a player name
   * Returns sanitized name if valid, error message if invalid
   */
  static validate(name: string): NameValidationResult {
    // Null/undefined check
    if (!name) {
      return { isValid: false, error: 'Name cannot be empty' };
    }

    const trimmed = name.trim();

    // Empty after trim
    if (!trimmed) {
      return { isValid: false, error: 'Name cannot be empty' };
    }

    // Too short
    if (trimmed.length < this.MIN_LENGTH) {
      return {
        isValid: false,
        error: `Name must be at least ${this.MIN_LENGTH} characters`,
      };
    }

    // Too long
    if (trimmed.length > this.MAX_LENGTH) {
      return {
        isValid: false,
        error: `Name must be at most ${this.MAX_LENGTH} characters`,
      };
    }

    // Invalid characters
    if (!this.ALLOWED_PATTERN.test(trimmed)) {
      return {
        isValid: false,
        error: 'Name can only contain letters, numbers, spaces, hyphens, and underscores',
      };
    }

    // Consecutive spaces check
    if (/\s{2,}/.test(trimmed)) {
      return {
        isValid: false,
        error: 'Name cannot contain consecutive spaces',
      };
    }

    return { isValid: true, sanitizedName: trimmed };
  }

  /**
   * Normalize a name for comparison (case-insensitive, trimmed)
   * Used for uniqueness checks
   */
  static normalize(name: string): string {
    return name.trim().toLowerCase();
  }

  /**
   * Check if a name is unique within a game
   * @param name - The name to check
   * @param players - Array of current players with id and name
   * @param excludePlayerId - Optional player ID to exclude (for reconnection scenarios)
   * @returns true if name is unique, false if taken
   */
  static isUniqueInGame(
    name: string,
    players: PlayerNameInfo[],
    excludePlayerId?: string
  ): boolean {
    const normalized = this.normalize(name);
    return !players.some(
      (p) => p.id !== excludePlayerId && this.normalize(p.name) === normalized
    );
  }

  /**
   * Find a player by name (case-insensitive)
   * @returns The player info if found, undefined otherwise
   */
  static findByName(
    name: string,
    players: PlayerNameInfo[]
  ): PlayerNameInfo | undefined {
    const normalized = this.normalize(name);
    return players.find((p) => this.normalize(p.name) === normalized);
  }
}
