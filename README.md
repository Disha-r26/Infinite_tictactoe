# Infinite Tic-Tac-Toe Analyzer — A Game-Theory AI Coach

A full-stack local-first application and game-theoretic engine that solves and analyzes 3×3 **Infinite Tic-Tac-Toe** with mathematical certainty.

---

## 🎯 What is Infinite Tic-Tac-Toe?

In Infinite Tic-Tac-Toe:
- The board has 9 cells arranged in a 3×3 grid.
- Players are **X** and **O**.
- Each player can have at most **3 active marks** on the board.
- Chronological order of each player's marks is tracked independently in a FIFO queue.
- When placing a **4th mark**, the player's oldest active mark **disappears immediately** before win checking (standard rule).
- A player wins by forming 3 marks along any of the 8 winning lines (3 horizontal rows, 3 vertical columns, 2 diagonals).

---

## 🧠 Complete Game-Theoretic Solver

This application solves the entire game graph via **retrograde analysis**:
- **Reachable State Space:** Exactly **133,364 positions** across all reachable paths.
- **Root Game-Theoretic Truth:** The first player has a **forced win in 13 plies** (7 turns).
- **The Center Trap:** In traditional Tic-Tac-Toe, center cell `B2` is favored. In Infinite Tic-Tac-Toe, **`B2` is only a DRAW**, while edge cells (**`B1`**, **`A2`**, **`C2`**, **`B3`**) are **proven forced wins in 13 plies**!
- **Tablebase Format:** Packed 25-bit integer state encoding with an embedded binary tablebase (`tablebaseData.ts` & `public/tablebase.bin`) allowing sub-millisecond $O(1)$ lookups with zero network requests.

---

## 📂 Project Structure & Codebase Map

```
C:\Users\Disha R\OneDrive\Desktop\tictactoe
├── package.json              # Project dependencies and script definitions
├── package-lock.json         # Pinned dependency versions
├── tsconfig.json             # TypeScript compiler settings (strict mode)
├── tailwind.config.js        # Tailwind CSS theme, colors, and layout tokens
├── postcss.config.js         # PostCSS plugins configuration
├── next.config.js            # Next.js production configuration & security headers
├── vercel.json               # Vercel deployment specification
├── .gitignore                # Git exclusions (node_modules, .next, local envs)
├── .env.example              # Environment variables template
├── public/                   # Static assets
│   └── tablebase.bin         # Binary tablebase containing all 133,364 solved states
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # HTML document layout and font imports
│   │   ├── page.tsx          # Main interactive interface, match setup, coordinator
│   │   └── globals.css       # Global styles and custom Tailwind utilities
│   ├── components/           # React interactive components
│   │   ├── ErrorBoundary.tsx # Production error boundary for crash prevention
│   │   ├── Board.tsx         # 3x3 interactive grid, mark age indicators (1, 2, 3), animations
│   │   ├── BestMovePanel.tsx # Primary recommendation: PROVEN WIN / DRAW / LOSS, PV line, explanation
│   │   ├── AlternativeMoves.tsx # Ranked alternative candidate moves with loss warnings
│   │   ├── NewGameModal.tsx  # Game setup modal: symbol selection (X or O) & starting player selector
│   │   ├── GameTimeline.tsx  # Chronological move timeline with history inspection & undo / redo
│   │   ├── Header.tsx        # Top navigation, status indicator, action buttons
│   │   ├── EngineStatus.tsx  # Search depth, nodes searched, engine method metrics
│   │   ├── OpponentAnalysis.tsx # Anticipated opponent tactics and counters
│   │   ├── ReconstructModal.tsx # Manual position reconstruction tool
│   │   ├── SettingsModal.tsx # Rules configuration (removal timing, repetition policy)
│   │   └── SimulationSandbox.tsx # What-if scenario exploration
│   └── engine/               # Pure TypeScript game-theory engine
│       ├── types.ts          # Core domain models, state interfaces, evaluation types
│       ├── constants.ts      # 8 winning lines, cell indices, coordinate mappings
│       ├── state.ts          # Pure state functions: applyMove, undoMove, validateState
│       ├── exactSolver.ts    # Retrograde tablebase query engine and move ranker
│       ├── tablebaseData.ts  # Base64-encoded tablebase of all 133,364 solved positions
│       ├── search.ts         # Alpha-beta search fallback with iterative deepening & transposition table
│       ├── evaluation.ts     # Positional heuristic evaluator
│       ├── serializer.ts     # Hardened JSON / string state import and export with bounds checking
│       └── __tests__/        # Complete Vitest test suite (83 automated tests)
│           ├── exact_solver.test.ts        # 23 tests: retrograde truth, 8 winning lines, mark expiration
│           ├── engine.test.ts              # 23 tests: rule invariants, FIFO queues, threefold repetition
│           ├── starting_player.test.ts     # 6 tests: all 4 player & symbol permutations
│           ├── search.test.ts              # 6 tests: tactical threats, time budgets, minimax equivalence
│           ├── serializer_security.test.ts # 11 tests: payload caps, ReDoS guards, prototype pollution
│           ├── rules_edge_cases.test.ts    # 10 tests: recycle mode, win-before-removal, fivefold draws
│           └── security_config.test.ts     # 4 tests: CSP headers, clickjacking, no localhost rewrites
└── node_modules/             # Pre-installed dependencies
```

---

## 🚀 How to Run the Application

This directory contains pre-installed dependencies in `node_modules/`. You can run commands right away:

### 1. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Run the Full Test Suite (83 Tests)
```bash
npx vitest run
```

### 3. Run Static Type Checking & Linting
```bash
npm run lint
```

### 4. Build & Run Production Server
```bash
npm run build
npm start
```

---

## 🔒 Security & Production Hardening Summary

1. **Content Security Policy (CSP):** Configured in `next.config.js` to restrict resource origins, block script injection, disallow object embeds (`object-src 'none'`), enforce secure font loading from Google Fonts, and deny framing (`frame-ancestors 'none'`).
2. **Clickjacking & MIME Protection:** Enforced with `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff`.
3. **Transport Security (HSTS):** Enforced with `max-age=63072000; includeSubDomains; preload`.
4. **Information Disclosure Prevention:** `poweredByHeader: false` suppresses `X-Powered-By: Next.js`. Hardcoded development rewrites to localhost have been eliminated.
5. **Client-Side DoS Protection:** Serialized inputs (JSON imports and move sequence strings) are strictly bounded to 64 KB and 200 moves maximum, preventing main thread freezing or out-of-memory crashes.
6. **Prototype Pollution Protection:** The rules sanitizer (`sanitizeRules`) strips unexpected keys and validates permitted values against strict whitelists.
7. **Crash Resilience:** React `ErrorBoundary` gracefully catches any unexpected rendering error and offers an immediate single-click match reset without losing application state.
8. **Lockfile & Artifact Hygiene:** Comprehensive `.gitignore` prevents committing `node_modules`, `.next`, credentials, or temporary build files.

---

## ☁️ Vercel Deployment Guide

1. **Repository Setup:**
   Push this directory to your private or public GitHub/GitLab repository:
   ```bash
   git init
   git add .
   git commit -m "feat: production hardened Infinite Tic-Tac-Toe analyzer"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. **Vercel Project Creation:**
   - Go to [Vercel Dashboard](https://vercel.com/new).
   - Import your repository.
   - Framework Preset: **Next.js** (automatically detected).
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
3. **Environment Variables:**
   - This application is 100% local-first and client-side; **no external database or third-party API keys are required**.
   - Optional: Set `NEXT_PUBLIC_SITE_URL` to your production domain.
4. **Deploy:** Click **Deploy**.

---

## 🛠️ Long-Term Maintenance Plan

- **Node.js Runtime:** Recommended Node.js LTS version: `v20.x` or `v22.x`.
- **Dependency Reviews:** Run `npm audit` quarterly. Pinned package versions in `package-lock.json` ensure reproducible builds.
- **Rule Engine Regression Tests:** Before any modifications to search algorithms or rules, run `npx vitest run` to ensure all 83 tests pass.
