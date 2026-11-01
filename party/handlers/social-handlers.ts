import type * as Party from "../runtime";
import type { ServerContext } from "../utils/types";
import { getPlayerId } from "../utils/helpers";

export function handleSendEmote(
  ctx: ServerContext,
  emoteId: string,
  sender: Party.Connection
): void {
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);

  const result = ctx.useCases.sendEmote.execute({
    game: ctx.game,
    playerId,
    emoteId,
  });

  ctx.broadcast(result.emoteEvent);
}

export function handleSendChat(
  ctx: ServerContext,
  message: string,
  sender: Party.Connection
): void {
  const playerId = getPlayerId(sender, ctx.connectionToPlayer);

  const result = ctx.useCases.sendChat.execute({
    game: ctx.game,
    playerId,
    message,
  });

  ctx.broadcast(result.chatMessageEvent);
}
