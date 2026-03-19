# Code Signing Policy

## Code signing

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org).

## Team roles

| Role | Member |
|---|---|
| Author, committer, reviewer | [Claudio Bartolini (@Maruga)](https://github.com/Maruga) |
| Approver | [Claudio Bartolini (@Maruga)](https://github.com/Maruga) |

## Privacy policy

GENKAI GM Dashboard is a desktop application that runs locally on the user's machine. The vast majority of features work entirely offline. The following network communications occur only when the user explicitly uses online features.

### Installation tracking

At each launch, the application sends an anonymous installation record to Firebase Firestore containing:

- A random installation ID (UUID, not linked to any personal information)
- Date of first launch and last launch
- Application version
- Operating system and architecture

This data is used solely to track the number of active installations. No personal information, IP addresses, or usage patterns are collected.

### Account and adventure catalog

Users may optionally create an account (email and password) to publish or download adventures from the online catalog. Account data is managed by Firebase Authentication. Published adventures are stored in Firebase Storage and Firestore with the author's display name and user ID.

### AI assistant

The application includes an AI assistant that sends user messages and relevant project file excerpts to OpenAI or Anthropic APIs, depending on the user's configuration. Users who do not configure an API key may use a limited free quota routed through the developer's API key. AI usage (token count) is tracked per user in Firebase Firestore to enforce quotas.

### Telegram integration

The Telegram bot integration communicates directly with the Telegram Bot API using a bot token provided by the user. No message content or player data transits through the developer's servers.

### Auto-updater

The application checks for updates via GitHub Releases using the electron-updater library. No personal data is sent during update checks.

### What this application does NOT do

- It does not display advertisements
- It does not sell or share user data with third parties
- It does not collect analytics, telemetry, or usage patterns beyond the anonymous installation record described above
- It does not modify system configuration
- It includes a standard NSIS uninstaller accessible from Windows Settings
