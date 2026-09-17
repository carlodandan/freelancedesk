# Developer & Contribution Guide

This guide provides everything you need to set up, build, test, and contribute to **FreelanceDesk** on Windows.

---

## 1. Prerequisites & Toolchain Setup

To develop FreelanceDesk locally on Windows, ensure the following dependencies are installed:

### 1.1 Windows C++ Build Tools
Tauri requires the MSVC C++ toolchain to compile Rust crates and Windows system bindings:
1. Download the [Visual Studio Installer](https://visualstudio.microsoft.com/downloads/).
2. Select **Desktop development with C++** workload.
3. Ensure **MSVC v143 - VS 2022 C++ x64/x86 build tools** and **Windows 10/11 SDK** are checked.

### 1.2 Rust Toolchain
Install Rust using `rustup`:
```powershell
winget install Rustlang.Rustup
# Or visit https://rustup.rs/
```
Verify the default host target is `x86_64-pc-windows-msvc`:
```powershell
rustup default stable-x86_64-pc-windows-msvc
rustc --version
cargo --version
```

### 1.3 Node.js & pnpm
Install Node.js 20+ and pnpm:
```powershell
winget install OpenJS.NodeJS.LTS
corepack enable
pnpm --version
```

---

## 2. Local Setup & Running Development

### 2.1 Clone Repository
```powershell
git clone https://github.com/carlodandan/freelancedesk.git
cd freelancedesk
pnpm install
```

### 2.2 Running in Desktop Mode (Tauri + Vite)
Launches the native Windows desktop application with hot-reloading for both the React frontend and Rust backend:
```powershell
pnpm tauri dev
```

### 2.3 Running in Web Mode (Vite Only)
To rapidly iterate on pure UI components without compiling the native Rust shell:
```powershell
pnpm dev
```
Open `http://localhost:1420` in your web browser. *(Note: Calls to native Tauri IPC commands will be unavailable or mocked in pure browser mode).*

---

## 3. Testing Workflows

FreelanceDesk maintains high test coverage across both frontend services/components and native Rust logic.

### 3.1 Frontend Unit & Integration Tests (Vitest)

FreelanceDesk uses **Vitest** paired with **@testing-library/react** and **jsdom**:

```powershell
# Run all tests once (CI mode)
pnpm test:run

# Run tests in interactive watch mode
pnpm test

# Run tests with V8 coverage report
pnpm test:coverage
```

#### Writing Frontend Tests
Tests live in `__tests__/` subdirectories adjacent to the features they test:
* `src/features/*/__tests__/*.test.tsx`: UI interaction, form filling, and modal workflows.
* `src/services/__tests__/currency.test.ts`: Currency conversion, integer cent rounding, and basis points.
* `src/services/__tests__/pdf.test.ts`: Vector PDF output verification and character code sanitization.
* `src/services/__tests__/validation.test.ts`: Input sanitization and format validation.

### 3.2 Rust Backend Tests (Cargo)

Run native database, migration, and storage unit tests:
```powershell
cargo test --manifest-path src-tauri/Cargo.toml
```

---

## 4. Code Quality & Formatting

Before committing changes, ensure your code conforms to project standards:

### 4.1 TypeScript Strict Check
```powershell
pnpm typecheck
```

### 4.2 Prettier Code Formatting
```powershell
# Check for formatting violations
pnpm format:check

# Automatically fix formatting
pnpm format:fix
```

### 4.3 Rust Formatting & Linting
```powershell
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml
```

---

## 5. Building & Packaging Windows Installers

To compile optimized standalone installers (`.msi` and `.exe`) for Windows:

```powershell
pnpm tauri build
```

### Release Profile Optimizations (`src-tauri/Cargo.toml`)
Production binaries are built with maximum performance and minimal file size:
```toml
[profile.release]
codegen-units = 1     # Maximizes Link-Time Optimization opportunities
lto = true            # Aggressive whole-program link-time dead code elimination
opt-level = 3         # Highest optimization level
panic = "abort"       # Eliminates unwinding landing pads to reduce binary size
strip = true          # Strips debug symbols from executable
```

### Installer Output Locations
Generated installers are deposited in:
* **MSI Installer**: `src-tauri/target/release/bundle/msi/FreelanceDesk_0.0.2_x64_en-US.msi`
* **NSIS Setup**: `src-tauri/target/release/bundle/nsis/FreelanceDesk_0.0.2_x64-setup.exe`

---

## 6. Common Troubleshooting

### Error: `link.exe not found` or `fatal error C1083`
* **Cause**: Visual Studio C++ Build Tools are missing or not added to PATH.
* **Fix**: Open Visual Studio Installer, ensure **Desktop development with C++** is installed, and restart PowerShell.

### Error: `Port 1420 is in use`
* **Cause**: A previous Vite or Tauri dev server process was left open in the background.
* **Fix**: Run `Get-Process node | Stop-Process` or configure an alternative port in `vite.config.ts`.

### Database Locked (`sqlite: database is locked`)
* **Cause**: Multiple app instances or an unclosed transaction hold a lock on `freelance.db`.
* **Fix**: Close running instances of `FreelanceDesk.exe`. The app uses WAL mode (`PRAGMA journal_mode = WAL;`) which allows simultaneous readers and writers under normal execution.

---

## 7. Git & Commit Guidelines

* Follow conventional commits format:
  * `feat(invoices): add export to CSV option`
  * `fix(pdf): resolve text collision in total card`
  * `docs(readme): update quick start prerequisites`
  * `test(payments): add integration test for partial payments`
* **Crucial Rule**: Never push directly to main without verification. Always ensure `pnpm test:run` and `pnpm build` pass with zero warnings or errors.
