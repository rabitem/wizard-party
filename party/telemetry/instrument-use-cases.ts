import type { Game } from '../../shared/domain';
import type { IUseCaseRegistry } from '../../shared/application';
import { isGameEvent } from './telemetry-mapper';
import type { GameTelemetry } from './telemetry-recorder';

/** Pure decision use cases whose output is not a fact (the bot's chosen move is recorded when played). */
const UNINSTRUMENTED: ReadonlySet<keyof IUseCaseRegistry> = new Set(['botTurn', 'turnTimeout']);

function capturesResult(telemetry: GameTelemetry, input: unknown, result: unknown): void {
  if (typeof result !== 'object' || result === null) return;
  const events = Object.values(result).filter(isGameEvent);
  if (events.length === 0) return;

  const game = (result as { newGame?: Game }).newGame ?? (input as { game?: Game } | undefined)?.game;
  if (game) telemetry.capture(events, game);
}

/**
 * Decorates every use case that produces facts (moves, chat, emotes, ...) so the domain events it
 * returns are recorded.
 *
 * Recording at the use-case boundary (instead of at broadcast) captures moves from humans and bots
 * alike, including information that is deliberately not broadcast, such as hidden bids.
 */
export function instrumentUseCases(registry: IUseCaseRegistry, telemetry: GameTelemetry): IUseCaseRegistry {
  const instrumented = { ...registry };
  for (const name of Object.keys(registry) as (keyof IUseCaseRegistry)[]) {
    if (UNINSTRUMENTED.has(name)) continue;
    instrumented[name] = new Proxy(registry[name], {
      get(target, property, receiver) {
        const value = Reflect.get(target, property, receiver);
        if (typeof value !== 'function' || !String(property).startsWith('execute')) return value;
        return (input: unknown, ...rest: unknown[]) => {
          const result = value.call(target, input, ...rest);
          capturesResult(telemetry, input, result);
          return result;
        };
      },
    }) as never;
  }
  return instrumented;
}
