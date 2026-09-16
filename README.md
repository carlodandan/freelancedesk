# FreelanceDesk

<div align="center">

![FreelanceDesk Logo](public/freelancedesk.png)

### The Artisanal Digital Ledger for Independent Freelancers & Creators

**Offline-first • Privacy-focused • No Accounts • No Subscriptions • Zero Cloud Lock-in**

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-24C8D8?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-2021_Edition-DEA584?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19.1-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Tests](https://img.shields.io/badge/Vitest-99_passed-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Platform](https://img.shields.io/badge/Platform-Windows_10%2B-0078D6?style=flat-square&logo=windows&logoColor=white)](https://microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-amber?style=flat-square)](LICENSE)

[Features](#-key-features) •
[Architecture](#-architecture--tech-stack) •
[Quick Start](#-quick-start) •
[Building & Packaging](#-production-build--packaging) •
[Documentation](#-documentation)

</div>

---

## 📖 Overview

**FreelanceDesk** is a fast, lightweight, and offline-first desktop application designed specifically for digital artists, writers, designers, developers, photographers, and independent service providers. 

Rather than burdening solo creators with bloated corporate CRM complexity, monthly SaaS subscriptions, or invasive cloud tracking, **FreelanceDesk** feels like a **distilled digital ledger**: personal, tactile, meticulously organized, and completely local to your workstation.

---

## 🏛️ Core Product Philosophy

* **Offline-First & Local-First**: 100% of your clients, jobs, receipts, financial records, and files are stored locally on your machine in an embedded SQLite database. No internet connection is ever required to run the app.
* **True Data Ownership**: Your records live in standard SQLite and local sandboxed folders (`%APPDATA%/com.carlodandan.freelancedesk/`). You can inspect, copy, backup, or restore them anytime.
* **No Accounts & No Subscriptions**: No sign-up modals, API keys, tracking scripts, or recurring paywalls.
* **Zero Telemetry**: No tracking beacons, analytics pings, or background network calls.
* **Artisanal "Warm Paper & Bronze" Identity**: Inspired by physical stationery, archival ledgers, and guild bookkeepers. Also includes **Clean Slate** and **Obsidian Dark** themes.
* **Integer Monetary Safety**: All monetary values are calculated and stored in integer **cents** with integer basis points for taxes, preventing floating-point rounding errors.

---

## ✨ Key Features

### 👥 1. Client Management & Ledger Profiles
* Maintain comprehensive client directories with primary contact information, handles (Discord, Twitter/X, Telegram), and billing addresses.
* Inspect complete per-client financial histories, active commissions, paid invoices, and outstanding receivables in a unified modal.
* Fast search and filtering by name, handle, company, and activity status.

### 🎨 2. Commissions & Job Orders
* Track project lifecycles through custom stages: `Inquiry` → `Quoted` → `Confirmed` → `In Progress` → `For Review` → `Revision` → `Completed`.
* Interactive deposit percentage calculation with automatic remaining balance tracking.
* Link commissions directly to broader projects or treat them as standalone creative requests.
* Multi-item job breakdowns with quantity, unit pricing, and percentage-based adjustments.

### 🧾 3. Professional Invoicing & Vector PDF Export
* Generate branded invoices with sequential numbering (e.g., `INV-2026-001`).
* Full line-item customization with real-time subtotal, discount, and tax basis-point calculations.
* One-click standalone vector PDF generation powered by a custom jsPDF rendering engine:
  * Dynamic line wrapping for long project descriptions.
  * Generous margins and 2.3mm+ baseline descender clearance.
  * Encoded currency isolation to prevent PDF font glyph masking across all readers.
  * Branded "Total Due" paper card highlight.

### 💳 4. Payments Ledger & Branded Receipts
* Record partial deposits, milestone disbursements, and final project settlements.
* Multi-method payment logging: Bank Transfer, GCash, PayPal, Stripe, Cash, and Custom methods.
* Instant generation of official branded payment receipts (`RCP-2026-001`) with reference numbers and remaining job balance indicators.

### 📉 5. Business Expenses & Deductions
* Categorize business outlays into Equipment, Software & Subscriptions, Studio Rent, Utilities, Subcontractors, and Marketing.
* Add and manage custom expense categories.
* Link expenses directly to specific client projects to calculate true job profitability.

### 📅 6. Visual Timeline & Deadline Calendar
* Full-month calendar view mapping upcoming project delivery dates and milestone milestones.
* Color-coded status pills indicating urgency and progress state.
* Quick navigation between months to foresee delivery bottlenecks.

### 📊 7. Financial Analytics & Ledger Reports
* Real-time ledger summary cards: Gross Revenue, Collected Cash, Total Expenses, Net Profit, and Pending Receivables.
* Monthly financial breakdown table detailing income vs. operational costs.
* Export-ready overview for end-of-year tax preparation.

### 🔍 8. Command Palette & Global Search (`Ctrl + K`)
* Instant global search modal accessible from anywhere via `Ctrl + K`.
* Seamlessly query across clients, commissions, invoices, and payments simultaneously.
* Full keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).

### 🛡️ 9. Automated & Instant Backups
* One-click database backup with automatic WAL checkpoint flushing (`PRAGMA wal_checkpoint(TRUNCATE)`).
* Safe restoration engine with automated pre-restore snapshot generation to guarantee zero data loss.
* Built-in `PRAGMA integrity_check` validation before committing any restoration.

### 🎨 10. Multi-Theme Token Architecture
* **Warm Paper (Default)**: Classical bookkeeper aesthetic with warm cream tones (`#FAF8F5`) and bronze gold accents (`#854D0E`).
* **Clean Slate**: Modern minimalist neutral grey palette.
* **Obsidian Dark**: High-contrast dark mode tailored for late-night editing sessions.
* Instant live theme switching without page reloads.

### 🔄 11. Seamless Auto-Updater (Tauri v2 + GitHub Releases)
* Built-in minisign-verified update pipeline powered by `@tauri-apps/plugin-updater`.
* Background startup watcher with non-intrusive toast notifications when new releases arrive.
* Full Settings panel check interface with download progress bar, release notes, and single-click restart.
* Windows passive MSI installer mode with atomic file replacement and automatic relaunch.

---

## 🏛️ Architecture & Tech Stack

```mermaid
graph TD
    subgraph UI ["Desktop UI (React 19 + TypeScript)"]
        Components["Accessible UI Primitives & Features"]
        DesignTokens["CSS Variable Tokens (3 Themes)"]
        TauriAPI["Tauri IPC Client (invoke)"]
        PDFService["jsPDF Vector Engine"]
    end

    subgraph Core ["Desktop Shell (Tauri v2 + Rust)"]
        IPCBridge["Tauri IPC Command Router (34 Commands)"]
        AppState["Shared Thread-Safe State (Mutex<Connection>)"]
        Storage["StorageManager (Sandbox Folders)"]
    end

    subgraph Data ["Local Storage Engine"]
        SQLite[("Embedded SQLite 3 (WAL Mode)")]
        FS["Attachments, Backups, Invoices & Receipts"]
    end

    Components --> TauriAPI
    Components --> PDFService
    TauriAPI --> IPCBridge
    IPCBridge --> AppState
    IPCBridge --> Storage
    AppState --> SQLite
    Storage --> FS
```

| Layer | Technology | Details |
|---|---|---|
| **Desktop Shell** | [Tauri v2](https://tauri.app/) | Ultra-lean native WebView2 wrapper on Windows with tiny memory footprint |
| **Backend / Native Engine** | [Rust](https://www.rust-lang.org/) (Edition 2021) | Safe, high-performance command handlers, Mutex state, and direct OS integrations |
| **Database** | [rusqlite 0.33](https://github.com/rusqlite/rusqlite) + SQLite 3 | Bundled SQLite engine with Write-Ahead Logging (`WAL`), strict foreign keys, and indexes |
| **Frontend Framework** | [React 19](https://react.dev/) | Modern functional component model with concurrent rendering |
| **Language** | [TypeScript 6.0](https://www.typescriptlang.org/) | Strict type checking with comprehensive entity and settings schemas |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | High-performance CSS compiler with three-layer semantic CSS variable design tokens |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, consistent vector iconography |
| **Document Export** | [jsPDF](https://github.com/parallax/jsPDF) | High-resolution client-side vector PDF generation with custom typography handling |
| **Testing Suite** | [Vitest](https://vitest.dev/) + RTL | 13 test suites, 99 unit/integration tests with jsdom emulation |

---

## 🚀 Quick Start

### Prerequisites

To develop or build FreelanceDesk locally on Windows, ensure you have the following installed:

1. **Node.js**: `v20.0.0` or higher ([Download Node.js](https://nodejs.org/))
2. **pnpm**: `v9.0.0` or higher (Install via `corepack enable` or `npm i -g pnpm`)
3. **Rust**: Latest stable toolchain ([Install via rustup](https://rustup.rs/))
4. **Visual Studio C++ Build Tools**: Required by Tauri on Windows (Install "Desktop development with C++" workload)
5. **WebView2**: Built into Windows 10/11 by default.

### Installation

Clone the repository and install frontend dependencies:

```bash
git clone https://github.com/carlodandan/freelancedesk.git
cd freelancedesk
pnpm install
```

### Running Local Development

#### Option A: Run in Desktop Tauri Mode (Full App)

Spawns the Vite dev server and launches the native Windows Tauri desktop window:

```bash
pnpm tauri dev
```

#### Option B: Run Frontend in Browser (Fast UI Iteration)

Launches Vite directly at `http://localhost:1420`:

```bash
pnpm dev
```

---

## 📜 Available Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the Vite frontend development server |
| `pnpm build` | Run TypeScript compiler (`tsc`) and Vite production bundle |
| `pnpm preview` | Locally preview the built production frontend |
| `pnpm test` | Run Vitest in interactive watch mode |
| `pnpm test:run` | Run the complete Vitest test suite once (CI mode) |
| `pnpm test:coverage` | Run Vitest with code coverage reporting |
| `pnpm typecheck` | Perform strict TypeScript type checking without emitting files |
| `pnpm format:check` | Verify formatting across TSX, CSS, and HTML using Prettier |
| `pnpm format:fix` | Format code automatically using Prettier |
| `pnpm tauri dev` | Launch the full desktop application in development mode |
| `pnpm tauri build` | Compile the optimized desktop `.exe` and `.msi` installers |

---

## 📦 Production Build & Packaging

To compile a standalone Windows installer and portable executable:

```bash
pnpm tauri build
```

This will:
1. Run `tsc && vite build` to compile optimized frontend assets into `dist/`.
2. Invoke `cargo build --release` with Link-Time Optimization (`lto = true`), symbol stripping (`strip = true`), and level 3 optimizations.
3. Bundle the Windows installer and application binary under:
   ```
   src-tauri/target/release/bundle/msi/FreelanceDesk_0.0.1_x64_en-US.msi
   src-tauri/target/release/bundle/nsis/FreelanceDesk_0.0.1_x64-setup.exe
   ```

---

## 🧪 Testing & Quality Assurance

FreelanceDesk maintains an automated test suite across both the frontend and native layers:

### Frontend Unit & Integration Tests (Vitest)

```bash
pnpm test:run
```

* **13 Test Suites / 99 Tests Passing (100%)**
* Covers:
  * Modal workflows & form validation (`ClientsView`, `InvoicesView`, `CommissionsView`, `PaymentsView`, `GlobalSearchModal`)
  * Currency parsing, basis point arithmetic, and integer formatting (`currency.ts`)
  * PDF document generation and character isolation (`pdf.ts`)
  * Validation rules, email sanitization, and required field invariants (`validation.ts`)
  * Financial reporting metrics and tax calculations (`reports.ts`)

### Rust Backend Tests (Cargo)

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

* Tests SQLite database initialization, WAL pragma enforcement, cascading deletions, schema migrations, and backup verification routines.

---

## 📂 Project Structure

```
freelancedesk/
├── .agents/                    # Agentic developer skills & workflow specifications
├── docs/                       # Comprehensive technical documentation suite
│   ├── ARCHITECTURE.md         # System design, C4 diagrams, IPC & security
│   ├── API_REFERENCE.md        # Tauri IPC command documentation (34 commands)
│   ├── DATABASE_SCHEMA.md      # SQLite tables, ERD, and migration guide
│   └── DEVELOPMENT_GUIDE.md    # Developer setup, testing, and contribution guide
├── public/                     # Static public assets & brand favicon
├── src/                        # React 19 Frontend Application
│   ├── assets/                 # Brand illustrations & logos
│   ├── components/             # Reusable UI primitives (Buttons, Modals, Toasts)
│   ├── features/               # Feature-sliced modules (Clients, Invoices, Payments, etc.)
│   ├── services/               # IPC client, PDF engine, currency & validation utilities
│   ├── styles/                 # Global CSS and three-layer theme tokens
│   ├── test/                   # Vitest setup & DOM mocks
│   └── types/                  # TypeScript domain models and interfaces
├── src-tauri/                  # Rust Native Desktop Backend
│   ├── src/
│   │   ├── commands/           # 34 modular IPC command handlers
│   │   ├── database/           # SQLite schema, migration manager & tests
│   │   ├── models/             # Rust domain structs (Serde-serializable)
│   │   ├── services/           # StorageManager & local sandboxing
│   │   ├── lib.rs              # Tauri builder & AppState configuration
│   │   └── main.rs             # Windows entry point
│   ├── Cargo.toml              # Rust crate dependencies & release profiles
│   └── tauri.conf.json         # Tauri v2 window & build configuration
├── package.json                # Frontend dependencies & npm scripts
├── tsconfig.json               # TypeScript strict configuration
└── vite.config.ts              # Vite + Tailwind + Vitest configuration
```

---

## 🔒 Data Storage, Privacy & Backups

All data created within FreelanceDesk stays strictly on your local computer.

### Windows Storage Directory

Data is stored within the standard Windows application data folder:
```
%APPDATA%/com.carlodandan.freelancedesk/
├── database/
│   ├── freelance.db            # Primary SQLite database
│   ├── freelance.db-wal        # Write-Ahead Log
│   └── freelance.db-shm        # Shared memory file
├── attachments/                # Attached contracts, briefs, and client assets
├── invoices/                   # Generated invoice records
├── receipts/                   # Generated payment receipt records
└── backups/                    # Automated and manual database snapshots
```

### Manual Backup Recommendation

To manually back up your data, you can simply:
1. Use the in-app **Backup Now** button in **Settings**.
2. Or fully close FreelanceDesk before copying the `%APPDATA%/com.carlodandan.freelancedesk/` directory to an external drive or private personal cloud folder (e.g., OneDrive, Google Drive, Proton Drive). Never copy the live database directory while the app is running.

---

## 📚 Documentation

For in-depth architectural and developer documentation, visit the [docs/](docs/) directory:

* 🏗️ [**Architecture & System Design**](docs/ARCHITECTURE.md)
* 🔌 [**Tauri IPC API Reference**](docs/API_REFERENCE.md)
* 🗄️ [**SQLite Database Schema & ERD**](docs/DATABASE_SCHEMA.md)
* 🛠️ [**Developer & Contribution Guide**](docs/DEVELOPMENT_GUIDE.md)

---

## 📄 License

This project is licensed under the **MIT License**. You are free to use, modify, and distribute FreelanceDesk according to the terms of the license.

---

<div align="center">
Crafted with pride for independent freelancers & creators worldwide.
</div>
