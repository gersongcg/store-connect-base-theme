---
name: request-pr
description: Organise commits and create a concise PR description based on the issues addressed.
---

# Pull Requests

Every PR should be organised around the issues or features being addressed.

## Commits

- Keep related Liquid templates and their CSS changes in the same commit when they belong to the same UI change.
- Commit new JavaScript with a short, descriptive commit message that clearly identifies its functionality.
- Group related changes together rather than creating unnecessary commits.
- Keep commit messages short, specific, and easy to understand.
- Avoid vague messages such as `fix`, `updates`, or `changes`.

## PR Description

Include a brief summary or short table listing the issues being addressed so it can be copied directly into the PR description.

Keep the PR description:

- Clear
- Concise
- Focused on what changed and why
- Easy to scan during review

Do not include verbose conceptual explanations or unnecessary implementation details. The description should give developers enough context to understand the scope of the PR and begin reviewing the code quickly.

No test plan is required.