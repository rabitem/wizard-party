-- Better Auth schema (identity, sessions, linked providers, 2FA, passkeys).
-- Generated from src/infrastructure/auth/auth-options.ts via better-auth getMigrations; regenerate on plugin changes.

create table "auth_users" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null, "twoFactorEnabled" boolean default false);

create table "auth_sessions" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "auth_users" ("id") on delete cascade);

create table "auth_accounts" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "auth_users" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "auth_verifications" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "auth_two_factors" ("id" text not null primary key, "secret" text not null, "backupCodes" text not null, "userId" text not null references "auth_users" ("id") on delete cascade, "verified" boolean, "failedVerificationCount" integer, "lockedUntil" timestamptz);

create table "auth_passkeys" ("id" text not null primary key, "name" text, "publicKey" text not null, "userId" text not null references "auth_users" ("id") on delete cascade, "credentialID" text not null, "counter" integer not null, "deviceType" text not null, "backedUp" boolean not null, "transports" text, "createdAt" timestamptz, "aaguid" text);

create index "auth_sessions_userId_idx" on "auth_sessions" ("userId");

create index "auth_accounts_userId_idx" on "auth_accounts" ("userId");

create index "auth_verifications_identifier_idx" on "auth_verifications" ("identifier");

create index "auth_two_factors_secret_idx" on "auth_two_factors" ("secret");

create index "auth_two_factors_userId_idx" on "auth_two_factors" ("userId");

create index "auth_passkeys_userId_idx" on "auth_passkeys" ("userId");

create index "auth_passkeys_credentialID_idx" on "auth_passkeys" ("credentialID");