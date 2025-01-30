# Contributing to Status Page

Thank you for your interest in contributing to the Status Page project! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct (see CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Issues

- Use the GitHub issue tracker to report bugs
- Check existing issues to avoid duplicates
- Include as much detail as possible
- Use the issue templates when provided

### Making Changes

1. Fork the repository
2. Create a feature branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes
4. Run validation checks
   ```bash
   npm run validate
   ```
5. Commit your changes following our commit message format
6. Push to your fork
7. Create a Pull Request

### Pull Request Process

1. Ensure your PR description clearly describes the changes
2. Link any related issues
3. Update documentation as needed
4. All checks must pass
5. Require approval from code owners

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation only
- style: Code style changes
- refactor: Code changes that neither fix bugs nor add features
- test: Adding or modifying tests
- chore: Maintenance tasks

### Branch Protection Rules

The `main` branch is protected:
- Requires pull request reviews
- Requires status checks to pass
- Requires signed commits
- No force pushes allowed

### Development Setup

1. Install dependencies
   ```bash
   npm install
   ```
2. Set up pre-commit hooks
   ```bash
   npm run prepare
   ```

## Questions?

Feel free to open an issue with questions about contributing.
