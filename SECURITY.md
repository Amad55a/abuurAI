# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities privately and responsibly. Do not open
a public issue, pull request, discussion, or post that includes exploit
instructions, sensitive data, or details that could put users at risk.

If GitHub private vulnerability reporting is enabled, use the repository's
**Security** tab and choose **Report a vulnerability**. If it is unavailable,
ask the maintainers for a private reporting channel without sharing
vulnerability details publicly.

Include only information needed to understand and reproduce the issue safely:

- Affected package version or commit, if known.
- The affected component and impact.
- Minimal reproduction steps or a proof of concept that does not access real
  accounts or data.
- Any suggested mitigation.

Do not include API keys, passwords, access tokens, private user data, or
production credentials. If a credential was exposed, revoke or rotate it
immediately and report the exposure privately.

The maintainers will assess reports and coordinate a fix and disclosure when
appropriate. No response-time or outcome guarantee is implied.

## API-key and application security

- Keep provider API keys in trusted server-side environments. Never put them
  in browser code, public repositories, frontend bundles, issue reports, or
  logs.
- Load environment variables in the application or deployment environment;
  the SDK does not automatically load `.env` files.
- Do not commit `.env`, `.env.*` secret files, credentials, or private keys.
  Use `.env.example` only for placeholder variable names and non-secret sample
  values.
- Rotate keys immediately if exposure is suspected. Removing a key from the
  latest code does not remove it from history or revoke it with the provider.
- Use fake credentials and mocked provider responses in automated tests.

A JavaScript SDK cannot keep a credential secret if an application exposes it
to a browser or another untrusted environment.

## Supported versions

Security reports are welcome for the current project version. Maintainers will
determine whether older versions are affected and whether a fix is available.
