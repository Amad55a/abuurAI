# Contributing to Abuur AI

Mahadsanid — thank you for considering a contribution. Abuur AI is a
Somali-led, Somali-first project, and contributions from Somali developers in
Somalia and across the diaspora are welcome. You do not need to be an expert
or a native Somali speaker to help.

## Ways to contribute

- Fix a bug or improve an existing SDK operation.
- Add or improve automated tests using fake providers and mocked APIs.
- Improve Somali spelling, grammar, translation prompts, or language examples.
- Report unclear behavior or suggest a focused improvement.
- Improve accessibility, examples, or contributor guidance.

For substantial changes, open a feature request or discussion before beginning
so the scope can be agreed on. Do not include secrets, API keys, or private
personal information in issues, pull requests, or test fixtures.

## Fork and prepare your branch

1. Sign in to GitHub and use **Fork** on the repository page. A fork is your
   own copy; it does not grant write access to this project.
2. Clone your fork and enter the project directory:

   ```sh
   git clone https://github.com/Amad55a/somali-ai-connect.git
   cd REPOSITORY
   ```

   Replace the example URL and directory with your fork's actual values.
3. Add the source repository as `upstream`:

   ```sh
   git remote add upstream https://github.com/Amad55a/somali-ai-connect.git
   ```

4. Create a focused feature branch from the default branch:

   ```sh
   git switch -c feat/short-description
   ```

   Use `fix/short-description` for bug fixes and `docs/short-description` for
   documentation-only work. Keep each pull request focused.

## Set up and test

Use the Node.js version required by `package.json` (currently Node.js 22 or
later), then install the locked dependencies:

```sh
npm ci
```

Run the complete test suite before submitting:

```powershell
npm.cmd test
```

Tests must use fake providers or mocked API clients. Do not make paid provider
requests or require real API keys to run tests. Never add keys to test code,
fixtures, screenshots, logs, or pull-request descriptions.

## Coding standards

- Use JavaScript ES modules and follow the existing project patterns.
- Keep the SDK's own implementation functional: use functions and closures;
  do not introduce classes.
- Make small, targeted changes and reuse existing provider, operation, and
  error-handling utilities.
- Preserve public Somali method names, provider behavior, and response
  structures unless the change explicitly requires otherwise.
- Validate inputs and surface errors clearly; do not silently substitute
  successful-looking results for unsupported operations.
- Avoid unrelated refactors, dependencies, and generated files.
- Add or update automated tests for behavior you change.
- Keep comments limited to logic that needs clarification.
- Do not commit `.env` files, API keys, credentials, or real user data.

## Somali language and dialect contributions

Somali language quality is central to this project. Contributions may include
reviewing natural phrasing, spelling, grammar, translation instructions,
code-switching examples, and language-test coverage.

- Provide the source text, proposed wording, and context for a language change.
- Use standard Somali spelling where appropriate, and identify regional or
  dialect-specific usage when it matters.
- Do not present one regional variety as the only valid Somali.
- Do not label or infer a dialect as reliable unless evidence and tests support
  that claim. Mark uncertain classifications as uncertain.
- Obtain permission before submitting another person's writing, recordings,
  translations, or other personal data. Prefer short, original examples.
- Do not claim that a prompt or model guarantees perfect translation or
  dialect identification.

If you are unsure about a phrase, explain the uncertainty in the pull request
so reviewers can assess it with you.

## Submit a pull request

1. Run `npm.cmd test` and review your diff for accidental files or secrets.
2. Push your branch to your fork.
3. Open a pull request against the repository's default branch. Explain the
   problem, the approach, and any behavior or compatibility changes.
4. Complete the pull-request template and link any related issue, if one
   exists.
5. Respond respectfully to review feedback and update your branch as needed.

Submitting a pull request does not automatically grant repository write
permissions. Maintainers review changes and decide whether and when to merge
them.

## First contribution?

Start with a small test, a typo or clarity fix, or an issue that needs
reproduction steps. Ask questions when project context is unclear. You may
also help by checking whether an existing issue can be reproduced without
sharing credentials. All contributors should be treated with patience and
respect.
