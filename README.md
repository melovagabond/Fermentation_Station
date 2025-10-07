# Fermentation Station 🥬🍯🍷

A simple web app for fermentation enthusiasts.  
Track vegetables, calculate salt for lacto-fermentation, design vinegar pickles, and plan mead/wine batches to hit your target ABV.  

Built with **React + Vite + TailwindCSS**.

---

## Features
- **Vegetable Tracker**  
  Add veggies by type & weight (stored in your browser).
- **Lacto Section**  
  Calculate dry-salt % or brine % for lacto-fermentation.
- **Pickle Section**  
  Vinegar:water brine calculator with salt % and sugar g/L options.
- **Brew Section**  
  Estimate sugar/honey needed for target ABV (wine & mead).
- **Presets**  
  Quick buttons for common salt %, pickle ratios, and ABV targets.

---

## Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/your-username/fermentation-station.git
cd fermentation-station
````

### 2. Install dependencies

```bash
npm install
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Tailwind Setup

### If using Tailwind v4:

* In `src/index.css`, add:

  ```css
  @import "tailwindcss";
  ```
* `tailwind.config.js` should include:

  ```js
  export default {
    content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  }
  ```

### If using Tailwind v3:

* In `src/index.css`, add:

  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
* Init config with:

  ```bash
  npx tailwindcss init -p
  ```

---

## Build for Production

```bash
npm run build
npm run preview
```

---

## Disclaimer

This tool provides **rule-of-thumb kitchen math** only.
Always follow safe, tested recipes for long-term storage.
Do not mess around with low-acidity vinegar unless you *like* gambling with botulism. 🦠

---

## License

MIT — do what you want, just don’t sue me if your sauerkraut explodes.
