-- Better Auth username plugin: unique lowercase handle for sign-in and /u/<username>, plus display casing.
-- Generated from src/infrastructure/auth/auth-options.ts via better-auth getMigrations; regenerate on plugin changes.

alter table "auth_users" add column "username" text;

alter table "auth_users" add column "displayUsername" text;

create unique index "auth_users_username_uidx" on "auth_users" ("username");

-- Set for accounts created while email delivery works; only those must confirm their email before
-- a password sign-in (sign-in-guards.ts). Existing rows stay false: their address was never checked.
alter table "auth_users" add column "emailVerificationRequired" boolean default false;
