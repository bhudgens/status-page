# GitHub Actions Backup

This directory contains GitHub Actions workflows that are not currently active but are ready to be moved to the `.github/workflows` directory when needed.

## Required Secrets

### ADMIN_TOKEN
The `branch-protection.yml` workflow requires an `ADMIN_TOKEN` secret to be set in the repository's secrets. This token must have admin permissions to set branch protection rules.

To set up this token:
1. Create a Personal Access Token (PAT) with the `repo` scope at https://github.com/settings/tokens
2. Add the token to your repository's secrets as `ADMIN_TOKEN`

## Available Workflows

### branch-protection.yml
- Purpose: Sets up branch protection rules for main and gh-pages branches
- Trigger: Manual (workflow_dispatch) or repository_dispatch
- Protection Rules:
  - main branch:
    - Requires pull request reviews
    - Requires status checks to pass
    - Enforces up-to-date branches
    - Includes administrators
    - Prevents force pushes and deletions
  - gh-pages branch:
    - Restricted to GitHub Actions
    - Prevents force pushes and deletions
    - Enforces admin rules
