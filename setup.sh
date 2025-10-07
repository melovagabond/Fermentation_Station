#!/usr/bin/env bash
set -euo pipefail

# Fermentation Station quick-start
# Usage:
#   ./setup.sh           # Tailwind v4 (default)
#   ./setup.sh --v3      # Tailwind v3 (legacy CLI flow)

TAILWIND_V3=0
if [[ "${1:-}" == "--v3" ]]; then
  TAILWIND_V3=1
fi

# --- helpers ---
need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "ERROR: '$1' is required but not found."; exit 1; }
}

ensure_node_version() {
  need_cmd node
  local v
  v="$(node -v | sed 's/^v//')"
  # Require >= 18.x
  local major="${v%%.*}"
  if (( major < 18 )); then
    echo "ERROR: Node >= 18 required (found v${v}). Use nvm: 'nvm install --lts && nvm use --lts'."
    exit 1
  fi
  echo "✔ Node $(node -v)"
}

ensure_in_repo() {
  if [[ ! -f "package.json" ]]; then
    echo "ERROR: package.json not found. Run this from the project root (where package.json lives)."
    exit 1
  fi
  echo "✔ Found package.json"
}

append_once() {
  # append_once <file> <needle> <content>
  local file="$1" needle="$2" content="$3"
  [[ -f "$file" ]] || touch "$file"
  if ! grep -qF "$needle" "$file"; then
    printf "%s\n" "$content" >> "$file"
  fi
}

# --- go ---
ensure_node_version
need_cmd npm
ensure_in_repo

echo "⏳ Installing dependencies…"
npm install

if (( TAILWIND_V3 == 0 )); then
  echo "⏳ Setting up Tailwind v4…"
  npm pkg delete devDependencies.tailwindcss >/dev/null 2>&1 || true
  npm pkg delete devDependencies.postcss >/dev/null 2>&1 || true
  npm pkg delete devDependencies.autoprefixer >/dev/null 2>&1 || true

  npm i -D @tailwindcss/cli @tailwindcss/postcss tailwindcss@latest

  # ensure content in config (create minimal v4 config)
  cat > tailwind.config.js <<'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
}
EOF

  # enforce Tailwind v4 PostCSS plugin usage
  cat > postcss.config.js <<'EOF'
import tailwindcss from "@tailwindcss/postcss"

export default {
  plugins: [tailwindcss()],
}
EOF

  # index.css with v4 import
  mkdir -p src
  if [[ ! -f src/index.css ]]; then
    echo '@import "tailwindcss";' > src/index.css
  else
    # ensure import present
    if ! grep -q '@import "tailwindcss";' src/index.css; then
      echo '@import "tailwindcss";' | cat - src/index.css > src/.index.css.tmp && mv src/.index.css.tmp src/index.css
    fi
  fi

else
  echo "⏳ Setting up Tailwind v3…"
  npm remove tailwindcss >/dev/null 2>&1 || true
  npm i -D tailwindcss@3 postcss autoprefixer
  npx tailwindcss init -p

  # ensure content in config
  if [[ -f tailwind.config.js ]]; then
    cat > tailwind.config.js <<'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
EOF
  fi

  # index.css with v3 directives
  mkdir -p src
  cat > src/index.css <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF
fi

# Ensure main entry imports the CSS (Vite’s default is src/main.jsx or src/main.tsx)
if [[ -f src/main.jsx && ! "$(grep -F 'import \"./index.css\"' -n src/main.jsx 2>/dev/null || true)" ]]; then
  sed -i '1s;^;import "./index.css";\n;' src/main.jsx
  echo "✔ Injected CSS import into src/main.jsx"
elif [[ -f src/main.tsx && ! "$(grep -F 'import \"./index.css\"' -n src/main.tsx 2>/dev/null || true)" ]]; then
  sed -i '1s;^;import "./index.css";\n;' src/main.tsx
  echo "✔ Injected CSS import into src/main.tsx"
else
  echo "ℹ CSS import already present (or non-standard entry file)."
fi

echo "🔧 Scripts available:"
jq -r '.scripts' package.json 2>/dev/null || cat package.json

echo "🚀 Starting dev server (Ctrl+C to quit)…"
npm run dev
