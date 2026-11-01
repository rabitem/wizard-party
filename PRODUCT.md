# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Friends arriving by invite link.** Someone shared a room; they want to pick a name and reach the
  table in seconds, on whatever device they opened the link on.
- **Returning regulars.** They know Wizard and want quick play, their recent rooms and the
  rankings.
- **New visitors** from search or social. They may not know Wizard yet and need to see what it is
  and why to play it here.

## Product Purpose

A free online version of the Wizard trick-taking card game, played by three to six people at a 3D
table in the browser. Players bid how many tricks they will win each round and score by hitting
the bid exactly. Bots fill empty seats. Success is people getting to a table quickly and coming
back.

## Positioning

Realms: one switch re-dresses the whole game, its UI, the 3D table and the cards, in one of eleven
looks (Classic, Halloween, Autumn, Winter, Spring, Summer, Manga, Neon, Pixel, Celestial,
Solarpunk). Add to that a real 3D table, guest play without an account, configurable house rules
and the anniversary-edition special cards.

## Operating Context

Played in a browser on phones, tablets and desktops, often by groups who arrange a game over chat
and share a room link. Rooms are public or private; a room code or link joins one.

## Capabilities and Constraints

- Guests play without an account; accounts add progress, achievements, friends, an inbox and
  hosted tournaments, and need a database the game itself does not.
- Rules are configurable per room; bots have five difficulty levels.
- The start page keeps all of today's content: the play controls, realm choice, live player
  count, tournaments, learn to play, recent rooms, Hall of Champions, the realm's statistics, how
  to win, the special card editions with publisher sources, and the footer with legal links.
- The start page may render one live WebGL scene in its first viewport, reusing the game's table
  and card parts, paused off-screen and with a static fallback on weak devices.

## Brand Commitments

- The name Wizard Party and the crown mark.
- The realms and their palettes, tables and card themes are the product's identity and stay.
- Wizard is a game by Ken Fisher, published by AMIGO; the site is an unofficial fan project and
  says so. Never imply endorsement.

## Evidence on Hand

Live player counts, game statistics and leaderboards come from the server when Redis and the
database are configured; locally the statistics panel shows labelled sample data. There are no
testimonials, press quotes or user counts to cite, and none may be invented.

## Product Principles

1. The table is the product: show it, don't describe it.
2. From link to seat in seconds: nothing stands between an invited friend and the table.
3. One realm dresses everything: a choice on the start page carries into the lobby and the game.
4. Free and honest: no dark patterns, no invented claims, a fan project that credits the original.

## Accessibility & Inclusion

Text contrast reaches WCAG AA on every realm. Motion respects `prefers-reduced-motion`. Every
action has a 44px touch target on coarse pointers.
