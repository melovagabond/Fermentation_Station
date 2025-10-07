#!/usr/bin/env bash
set -euo pipefail

# Bootstrap a clean React + Vite + Tailwind v4 app (no create-vite).
# Usage:
#   ./bootstrap.sh                 # creates ./fermentation-station
#   ./bootstrap.sh --name myapp    # creates ./myapp
#   ./bootstrap.sh --git           # also git init + first commit

APP_NAME="fermentation-station"
DO_GIT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) APP_NAME="$2"; shift 2;;
    --git) DO_GIT=1; shift;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

# --- sanity checks ---
need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: '$1' required."; exit 1; }; }
need node
need npm

# Node >= 18
NODE_V=$(node -v | sed 's/^v//')
NODE_MAJOR=${NODE_V%%.*}
if (( NODE_MAJOR < 18 )); then
  echo "ERROR: Node >= 18 required (found v$NODE_V). Use nvm: nvm install --lts && nvm use --lts"
  exit 1
fi

# --- create project dir ---
if [[ -e "$APP_NAME" ]]; then
  echo "ERROR: '$APP_NAME' already exists. Choose a different --name or remove it."
  exit 1
fi
mkdir -p "$APP_NAME"
cd "$APP_NAME"

# --- files: package.json ---
cat > package.json <<'EOF'
{
  "name": "fermentation-station",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --open"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@tailwindcss/cli": "^4.1.14",
    "@tailwindcss/postcss": "^4.1.14",
    "@vitejs/plugin-react": "^4.3.3",
    "tailwindcss": "^4.1.14",
    "vite": "^5.4.10"
  }
}
EOF

# --- files: .gitignore ---
cat > .gitignore <<'EOF'
node_modules
dist
.vite
*.log
.env
.env.*
.DS_Store
EOF

# --- files: vite config ---
cat > vite.config.js <<'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()]
})
EOF

# --- files: tailwind v4 + postcss ---
cat > tailwind.config.js <<'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
}
EOF

cat > postcss.config.js <<'EOF'
import tailwind from '@tailwindcss/postcss'

export default {
  plugins: [tailwind()],
}
EOF

# --- files: index.html ---
cat > index.html <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0" />
    <title>Fermentation Station</title>
  </head>
  <body class="bg-slate-50">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

# --- files: src ---
mkdir -p src

cat > src/index.css <<'EOF'
@import "tailwindcss";
EOF

cat > src/main.jsx <<'EOF'
import './index.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
EOF

# Placeholder App — replace with the full Fermentation Station component later
cat > src/App.jsx <<'EOF'
export default function App() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-2xl w-full p-8 rounded-2xl shadow bg-white">
        <h1 className="text-3xl font-black">Fermentation Station</h1>
        <p className="text-slate-600 mt-2">
          If you can read this, Vite + React + Tailwind v4 are working.
        </p>
        <ol className="list-decimal ml-6 mt-4 space-y-1 text-slate-700">
          <li>Open <code>src/App.jsx</code></li>
          <li>Paste the full Fermentation Station React component</li>
          <li>Save — the dev server will hot-reload</li>
        </ol>
      </div>
    </div>
  )
}
EOF

# --- files: README.md ---
cat > README.md <<'EOF'
# Fermentation Station 🥬🍯🍷

A simple web app for fermentation math:
- Veg tracking
- Lacto (dry-salt & brine)
- Pickles (vinegar ratios, salt%, sugar)
- Brew (mead/wine ABV planning)

## Run
```bash
npm install
npm run dev

Got it. Here’s a single, self-contained bootstrap script that turns a **completely empty directory** into a running **Vite + React + Tailwind v4** Fermentation Station app — no `create-vite` needed, no prior files required.

Save this as `bootstrap.sh` anywhere, `chmod +x bootstrap.sh`, and run it. It will:

* create a new project folder (default `fermentation-station`, configurable with `--name`)
* initialize `git` (optional flag)
* write all config/files (Vite, Tailwind v4, PostCSS, index.html, React entry)
* install deps
* start the dev server

It uses a **placeholder** `App.jsx`. After it’s up, replace `src/App.jsx` with the big Fermentation Station component I gave you earlier.

````bash
#!/usr/bin/env bash
set -euo pipefail

# Bootstrap a clean React + Vite + Tailwind v4 app (no create-vite).
# Usage:
#   ./bootstrap.sh                 # creates ./fermentation-station
#   ./bootstrap.sh --name myapp    # creates ./myapp
#   ./bootstrap.sh --git           # also git init + first commit

APP_NAME="fermentation-station"
DO_GIT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) APP_NAME="$2"; shift 2;;
    --git) DO_GIT=1; shift;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

# --- sanity checks ---
need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: '$1' required."; exit 1; }; }
need node
need npm

# Node >= 18
NODE_V=$(node -v | sed 's/^v//')
NODE_MAJOR=${NODE_V%%.*}
if (( NODE_MAJOR < 18 )); then
  echo "ERROR: Node >= 18 required (found v$NODE_V). Use nvm: nvm install --lts && nvm use --lts"
  exit 1
fi

# --- create project dir ---
if [[ -e "$APP_NAME" ]]; then
  echo "ERROR: '$APP_NAME' already exists. Choose a different --name or remove it."
  exit 1
fi
mkdir -p "$APP_NAME"
cd "$APP_NAME"

# --- files: package.json ---
cat > package.json <<'EOF'
{
  "name": "fermentation-station",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --open"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@tailwindcss/cli": "^4.1.14",
    "@tailwindcss/postcss": "^4.1.14",
    "@vitejs/plugin-react": "^4.3.3",
    "tailwindcss": "^4.1.14",
    "vite": "^5.4.10"
  }
}
EOF

# --- files: .gitignore ---
cat > .gitignore <<'EOF'
node_modules
dist
.vite
*.log
.env
.env.*
.DS_Store
EOF

# --- files: vite config ---
cat > vite.config.js <<'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()]
})
EOF

# --- files: tailwind v4 + postcss ---
cat > tailwind.config.js <<'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
}
EOF

cat > postcss.config.js <<'EOF'
import tailwind from '@tailwindcss/postcss'

export default {
  plugins: [tailwind()],
}
EOF

# --- files: index.html ---
cat > index.html <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0" />
    <title>Fermentation Station</title>
  </head>
  <body class="bg-slate-50">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

# --- files: src ---
mkdir -p src

cat > src/index.css <<'EOF'
@import "tailwindcss";
EOF

cat > src/main.jsx <<'EOF'
import './index.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
EOF

# Placeholder App — replace with the full Fermentation Station component later
cat > src/App.jsx <<'EOF'
export default function App() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-2xl w-full p-8 rounded-2xl shadow bg-white">
        <h1 className="text-3xl font-black">Fermentation Station</h1>
        <p className="text-slate-600 mt-2">
          If you can read this, Vite + React + Tailwind v4 are working.
        </p>
        <ol className="list-decimal ml-6 mt-4 space-y-1 text-slate-700">
          <li>Open <code>src/App.jsx</code></li>
          <li>Paste the full Fermentation Station React component</li>
          <li>Save — the dev server will hot-reload</li>
        </ol>
      </div>
    </div>
  )
}
EOF

# --- files: README.md ---
cat > README.md <<'EOF'
# Fermentation Station 🥬🍯🍷

A simple web app for fermentation math:
- Veg tracking
- Lacto (dry-salt & brine)
- Pickles (vinegar ratios, salt%, sugar)
- Brew (mead/wine ABV planning)

## Run
```bash
npm install
npm run dev
````

Open the URL Vite prints (usually [http://localhost:5173](http://localhost:5173)).

## Tailwind v4

* `src/index.css` uses `@import "tailwindcss";`
* `postcss.config.js` uses `@tailwindcss/postcss`
* `tailwind.config.js` scans `./index.html` and `./src/**/*`

## Next Steps

Replace `src/App.jsx` with the full app component.
EOF

# --- install deps ---

echo "⏳ Installing dependencies…"
npm install

