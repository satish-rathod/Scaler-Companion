# Frontend Initialization Plan

## 1. Directory Structure

The frontend will be built using React with Vite and Tailwind CSS. It will reside in the `dashboard/` directory.

```
dashboard/
├── public/
│   └── vite.svg
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/         # Reusable UI components (Button, Card, Modal)
│   │   ├── layout/         # Layout components (Sidebar, Header)
│   │   └── features/       # Feature-specific components
│   │       ├── queue/
│   │       └── recording/
│   ├── hooks/              # Custom React hooks (useRecordings, useSocket)
│   ├── lib/
│   │   └── utils.ts        # CN utility for tailwind
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── QueuePage.jsx
│   │   ├── RecordingPage.jsx
│   │   └── SettingsPage.jsx
│   ├── services/
│   │   └── api.ts          # Axios/Fetch wrapper for Backend API
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css           # Tailwind directives
├── .env                    # API URL config
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

## 2. Dependencies

The `package.json` will include:

### Core
- `react`, `react-dom` - UI Framework
- `react-router-dom` - Routing

### Build & Style
- `vite` - Build tool
- `tailwindcss`, `postcss`, `autoprefixer` - Styling
- `clsx`, `tailwind-merge` - Utility for dynamic classes

### Data Fetching & State
- `axios` or `tanstack/react-query` - API interactions (Recommend React Query for caching)
- `zustand` - Lightweight global state (for queue status, user prefs)

### UI Components (Optional but recommended)
- `lucide-react` - Icons
- `radix-ui` primitives OR `shadcn/ui` (if copying components)
- `react-markdown` - To render the generated markdown notes
- `rehype-raw`, `remark-gfm` - For rich markdown rendering

## 3. Configuration Scaffolding

**`dashboard/vite.config.js`**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

**`dashboard/tailwind.config.js`**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## 4. Execution Plan (Initialization)

To initialize the frontend:

1.  **Create Project:** `npm create vite@latest dashboard -- --template react`
2.  **Navigate:** `cd dashboard`
3.  **Install Tailwind:**
    ```bash
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    ```
4.  **Configure Tailwind:** Update `tailwind.config.js` and `index.css`.
5.  **Install Deps:** `npm install react-router-dom lucide-react axios clsx tailwind-merge`
6.  **Scaffold Directories:** Create `src/components`, `src/pages`, `src/services`.
7.  **Run Dev:** `npm run dev`
