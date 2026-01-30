# Contributing to ShadowSwap

Thank you for your interest in contributing to ShadowSwap! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature/fix
4. Make your changes
5. Submit a pull request

## Development Setup

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/shadowswap.git
cd shadowswap

# Install dependencies
cd frontend && npm install
cd ../contracts_foundry && forge install
cd ../keeper-bot && npm install
```

## Code Style

### Solidity

- Use Solidity 0.8.20+
- Follow OpenZeppelin naming conventions
- Include NatSpec comments for all public functions
- Run `forge fmt` before committing

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow existing code style
- Use ESLint and Prettier
- Run `npm run lint` before committing

## Pull Request Process

1. Update the README.md if needed
2. Update documentation for any changed functionality
3. Ensure all tests pass
4. Request review from maintainers

## Reporting Issues

When reporting issues, please include:

- Description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, browser, wallet)

## Security

If you discover a security vulnerability, please:

1. **DO NOT** create a public issue
2. Email security concerns to the maintainers
3. Allow time for a fix before disclosure

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
