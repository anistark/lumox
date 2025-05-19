# Lumox: Local-first encrypted chat storage with IPFS backup capabilities
# https://github.com/anistark/lumox

# Load package.json data
PKG_NAME := `node -e "console.log(require('./package.json').name)"`
PKG_VERSION := `node -e "console.log(require('./package.json').version)"`
PKG_DESCRIPTION := `node -e "console.log(require('./package.json').description)"`

# Default recipe to run when just is called without arguments
default:
    @just --list

# Install dependencies
install:
    pnpm install

# Build the project
build:
    @echo "Building {{PKG_NAME}} v{{PKG_VERSION}}..."
    pnpm run build

# Run the example
example:
    @echo "Running example..."
    pnpm run example

# Run the example with transpileOnly flag for troubleshooting
example-transpile:
    @echo "Running example with transpileOnly flag..."
    pnpm tsx --transpileOnly examples/node-example.ts

# Run tests
test:
    @echo "Running tests..."
    pnpm test

# Run tests with watch mode
test-watch:
    @echo "Running tests in watch mode..."
    pnpm test -- --watch

# Format code with Prettier
format:
    @echo "Formatting code..."
    pnpm prettier --write "src/**/*.ts" "examples/**/*.ts" "tests/**/*.ts"

# Lint code with ESLint
lint:
    @echo "Linting code..."
    pnpm eslint "src/**/*.ts" "examples/**/*.ts" "tests/**/*.ts"

# Fix lint issues automatically
lint-fix:
    @echo "Fixing lint issues..."
    pnpm eslint "src/**/*.ts" "examples/**/*.ts" "tests/**/*.ts" --fix

# Run type checking
typecheck:
    @echo "Type checking..."
    pnpm tsc --noEmit

# Clean build artifacts
clean:
    @echo "Cleaning build artifacts..."
    rm -rf dist
    rm -rf .tsbuildinfo
    @echo "Cleaned build artifacts."

# Build and publish to npm
publish: clean lint test build
    @echo "Publishing {{PKG_NAME}} v{{PKG_VERSION}}..."
    pnpm publish --access public

# Create a new version (patch, minor, major)
bump VERSION="patch":
    @echo "Bumping version ({{VERSION}})..."
    pnpm version {{VERSION}}
    @echo "New version: `node -e \"console.log(require('./package.json').version)\"`"

# Build and publish a new version (patch, minor, major)
release VERSION="patch": (bump VERSION) (publish)

# Show project info
info:
    @echo "Project: {{PKG_NAME}} v{{PKG_VERSION}}"
    @echo "Description: {{PKG_DESCRIPTION}}"
    @echo "Node version: `node --version`"
    @echo "PNPM version: `pnpm --version`"

# Install dependencies needed for development
setup-dev:
    @echo "Setting up development environment..."
    pnpm add -D typescript tsup jest ts-jest @types/jest prettier eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-config-prettier

# Prepare a commit (lint, format, test)
precommit: format lint test
    @echo "Precommit checks passed! Ready to commit."
