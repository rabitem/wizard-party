# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by emailing the repository owner directly rather than opening a public issue.

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

## Scope

This policy covers:

- The Wizard Party web application
- The PartyKit server implementation
- Any hosted deployments

## Security Considerations

### Client-Server Trust

- All game state validation happens server-side
- Clients receive only the information they're allowed to see (e.g., other players' cards are hidden)
- Player actions are validated before being applied

### Room Security

- Private rooms can be password-protected
- Room IDs are randomly generated UUIDs
- Session persistence uses browser-local storage only

### Data Handling

- No personal data is collected or stored beyond player-chosen display names
- Game state is stored temporarily in PartyKit's edge storage
- No authentication system - players are identified by session tokens
