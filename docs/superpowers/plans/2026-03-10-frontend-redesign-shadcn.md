# Frontend Redesign Plan: shadcn/ui + 21st.dev Magic

**Date:** 2026-03-10
**Scope:** Full dashboard UI overhaul — replace all hand-rolled components with shadcn/ui
**Tools:** shadcn MCP server, 21st.dev Magic MCP, Tailwind CSS v4

---

## Phase 0: Documentation & API Discovery (Completed)

### Sources Consulted
- shadcn/ui docs: sidebar, button, card, dialog, breadcrumb, tabs, select, input, progress, badge, etc.
- Current codebase: 21 files across 5 pages + 17 components
- shadcn registry: 403 items available (58 UI components, 300+ blocks)

### Allowed APIs (shadcn/ui Component Reference)

| Component | Import | Key Subcomponents / Props |
|-----------|--------|--------------------------|
| **Sidebar** | `@/components/ui/sidebar` | SidebarProvider, Sidebar, SidebarHeader, SidebarFooter, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger. Props: `side`, `variant`, `collapsible="icon"` |
| **Button** | `@/components/ui/button` | Props: `variant` (default/outline/ghost/destructive/secondary/link), `size` (default/xs/sm/lg/icon) |
| **Card** | `@/components/ui/card` | Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter |
| **Dialog** | `@/components/ui/dialog` | Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter |
| **Tabs** | `@/components/ui/tabs` | Tabs, TabsList, TabsTrigger, TabsContent. Controlled: `value`, `onValueChange` |
| **Badge** | `@/components/ui/badge` | Props: `variant` (default/secondary/destructive/outline) |
| **Input** | `@/components/ui/input` | Standard HTML input props |
| **Select** | `@/components/ui/select` | Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel |
| **Progress** | `@/components/ui/progress` | Props: `value` (0-100) |
| **Skeleton** | `@/components/ui/skeleton` | Simple div-based shimmer |
| **Switch** | `@/components/ui/switch` | Props: `checked`, `onCheckedChange` |
| **Separator** | `@/components/ui/separator` | Horizontal/vertical divider |
| **Tooltip** | `@/components/ui/tooltip` | TooltipProvider, Tooltip, TooltipTrigger, TooltipContent |
| **ScrollArea** | `@/components/ui/scroll-area` | ScrollArea, ScrollBar |
| **Checkbox** | `@/components/ui/checkbox` | Props: `checked`, `onCheckedChange` |
| **Table** | `@/components/ui/table` | Table, TableHeader, TableBody, TableRow, TableHead, TableCell |
| **DropdownMenu** | `@/components/ui/dropdown-menu` | DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem |
| **Alert** | `@/components/ui/alert` | Alert, AlertTitle, AlertDescription. Props: `variant` |
| **Breadcrumb** | `@/components/ui/breadcrumb` | Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator |
| **Sonner** | `@/components/ui/sonner` | Toaster component + `toast()` from sonner |
| **Spinner** | `@/components/ui/spinner` | Loading spinner |
| **Empty** | `@/components/ui/empty` | Empty state placeholder |
| **Label** | `@/components/ui/label` | Form label |
| **Popover** | `@/components/ui/popover` | Popover, PopoverTrigger, PopoverContent |

### Anti-Pattern Guards
- Do NOT use `@shadcn/ui` as npm package — components are copied into `src/components/ui/`
- Do NOT import from `shadcn` — always import from `@/components/ui/<name>`
- Do NOT mix hand-rolled form inputs with shadcn — migrate all or none per form
- Do NOT remove Notion theme CSS variables yet — map them to shadcn's CSS variable system
- Tailwind v4 uses `@theme` directive, NOT `tailwind.config.js` — shadcn init must handle this

### Current State Assessment

**What exists:**
- Vite v7 with `@` → `./src` alias in vite.config.js
- Tailwind CSS v4 via `@tailwindcss/postcss`
- PostCSS with autoprefixer
- Custom Notion-inspired CSS variables (light/dark)
- 14 direct npm dependencies

**What's missing (required for shadcn):**
- `components.json` — shadcn project config
- `src/lib/utils.js` — cn() utility function
- `src/components/ui/` — shadcn component directory
- `jsconfig.json` — path alias for non-TypeScript project

---

## Phase 1: shadcn/ui Foundation Setup

### Goal
Initialize shadcn/ui in the dashboard project and install all required base components.

### Tasks

#### 1.1 Initialize shadcn/ui
```bash
cd /Users/satish/projects/Scaler-Companion/dashboard
npx shadcn@latest init
```
- When prompted: style = "default", base color = "neutral", CSS variables = yes
- This creates: `components.json`, `src/lib/utils.js` (with `cn()` function), updates `index.css` with shadcn CSS variables

#### 1.2 Create jsconfig.json (if not created by init)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### 1.3 Install all required shadcn components
```bash
npx shadcn@latest add button card badge dialog tabs input select label progress skeleton separator switch tooltip scroll-area sonner spinner checkbox table dropdown-menu alert breadcrumb sidebar popover empty
```

#### 1.4 Merge CSS Variables — Map Notion Theme to shadcn
Update `src/index.css` to keep Notion-inspired colors but map them into shadcn's CSS variable system:
- `--background` → current `--color-notion-bg` (#FFFFFF / #191919)
- `--foreground` → current `--color-notion-text` (#37352F / #D4D4D4)
- `--muted` → current `--color-notion-sidebar` (#F7F7F5 / #202020)
- `--muted-foreground` → current `--color-notion-dim` (#9B9A97 / #888888)
- `--border` → current `--color-notion-border` (#E9E9E7 / #333333)
- `--accent` → current `--color-notion-hover` (#F1F1EF / #2C2C2C)
- Keep `--primary` as a tasteful accent (blue-600 range)
- Keep `--destructive` for error states (red-600 range)

#### 1.5 Add Toaster to App.jsx
```jsx
import { Toaster } from "@/components/ui/sonner"
// Inside App return:
<>
  <BrowserRouter>...</BrowserRouter>
  <Toaster />
</>
```

### Verification Checklist
- [ ] `components.json` exists with correct paths
- [ ] `src/lib/utils.js` exports `cn()` function
- [ ] `src/components/ui/` has all installed component files
- [ ] `jsconfig.json` exists with `@/*` path alias
- [ ] `npm run dev` starts without errors
- [ ] shadcn CSS variables present in `index.css`
- [ ] Notion theme colors preserved (mapped to shadcn variables)

### Files Created/Modified
- `dashboard/components.json` (NEW)
- `dashboard/jsconfig.json` (NEW or MODIFIED)
- `dashboard/src/lib/utils.js` (NEW)
- `dashboard/src/components/ui/*.jsx` (NEW — ~25 files)
- `dashboard/src/index.css` (MODIFIED — merged CSS variables)
- `dashboard/src/App.jsx` (MODIFIED — add Toaster)
- `dashboard/package.json` (MODIFIED — new deps from shadcn)

---

## Phase 2: Layout & Navigation Redesign

### Goal
Replace the custom Layout + Sidebar with shadcn's Sidebar component (collapsible to icons). Add a proper top header with breadcrumbs.

### Tasks

#### 2.1 Replace Sidebar.jsx with shadcn Sidebar
Use the **sidebar-07** block pattern (collapses to icons) as reference.

**New `src/components/layout/AppSidebar.jsx`:**
- Use `SidebarProvider` + `Sidebar` with `collapsible="icon"` prop
- Navigation items: Home (Home icon), Queue (Activity icon), Search (Search icon), Settings (Settings icon)
- Use `SidebarMenu` > `SidebarMenuItem` > `SidebarMenuButton` with `asChild` for React Router Links
- Active state via `useLocation()` comparing `pathname`
- Add app logo/name in `SidebarHeader`
- Add `SidebarTrigger` for collapse toggle
- Use `Tooltip` on each menu button (shows label when collapsed to icons)

#### 2.2 Replace Layout.jsx with SidebarProvider pattern
**Update `src/components/layout/Layout.jsx`:**
```jsx
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { SiteHeader } from "./SiteHeader"

export function Layout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

#### 2.3 Create SiteHeader with Breadcrumbs
**New `src/components/layout/SiteHeader.jsx`:**
- Sticky top header using `<header>` with `sticky top-0 z-10 bg-background/80 backdrop-blur`
- Left side: `SidebarTrigger` + `Separator` + `Breadcrumb` (dynamic based on route)
- Right side: Theme toggle button (sun/moon icon)
- Use `useLocation()` to generate breadcrumb items dynamically
- Breadcrumb mapping: `/` → "Library", `/recording/:id` → "Library > {title}", `/queue` → "Queue", etc.

#### 2.4 Delete old files
- Delete `src/components/layout/Sidebar.jsx` (replaced by AppSidebar.jsx)
- Keep `src/hooks/useTheme.js` (still needed for theme toggle)

### Verification Checklist
- [ ] Sidebar renders with 4 nav items (Home, Queue, Search, Settings)
- [ ] Sidebar collapses to icon-only mode on trigger click
- [ ] Active navigation item is highlighted
- [ ] Breadcrumbs show correct path on each page
- [ ] Theme toggle works in header
- [ ] All pages render correctly within new layout
- [ ] No references to old Sidebar.jsx remain

### Files Created/Modified
- `dashboard/src/components/layout/AppSidebar.jsx` (NEW)
- `dashboard/src/components/layout/SiteHeader.jsx` (NEW)
- `dashboard/src/components/layout/Layout.jsx` (REWRITTEN)
- `dashboard/src/components/layout/Sidebar.jsx` (DELETED)

### Documentation References
- shadcn Sidebar: collapsible="icon" prop, SidebarProvider/SidebarInset pattern
- shadcn Breadcrumb: BreadcrumbList > BreadcrumbItem > BreadcrumbLink/BreadcrumbPage
- sidebar-07 block: icon-collapse pattern with tooltips

---

## Phase 3: HomePage Redesign

### Goal
Transform the recording library grid into a polished dashboard with shadcn Cards, proper empty states, skeleton loading, and dropdown actions.

### Tasks

#### 3.1 Redesign RecordingCard with shadcn Card
**Rewrite `src/components/features/recording/RecordingCard.jsx`:**
- Use `Card` with hover effect (`hover:shadow-md transition-shadow`)
- `CardHeader` with title (truncated) + `CardAction` for dropdown menu
- `CardContent` with status badge + metadata (date, duration)
- Replace emoji icons with proper `Avatar` or icon in a colored circle
- `DropdownMenu` on the "..." button: "View", "Process", "Delete" actions
- `Progress` component for download/processing progress (visible only when active)
- Use `Badge` variants: default (processed), secondary (queued), destructive (error)
- Click card → navigate to `/recording/:id`

#### 3.2 Replace StatusBadge with shadcn Badge
**Rewrite `src/components/features/recording/StatusBadge.jsx`:**
- Map status → shadcn Badge variant:
  - "processed" / "complete" → `variant="default"` (green-tinted via className)
  - "downloading" / "processing" → `variant="secondary"` (blue-tinted)
  - "queued" / "waiting" → `variant="outline"`
  - "error" / "failed" → `variant="destructive"`

#### 3.3 Redesign HomePage with loading states + empty state
**Rewrite `src/pages/HomePage.jsx`:**
- Use shadcn `Skeleton` for loading state (grid of skeleton cards)
- Use shadcn `Empty` component for zero recordings state
- Use 21st.dev Magic MCP for empty state design inspiration (illustration + CTA)
- Page header: "Recording Library" title + "Process New" button (using shadcn Button)
- Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Error state: shadcn `Alert` variant="destructive" with retry button

### Verification Checklist
- [ ] Recording cards render with shadcn Card + Badge + Progress
- [ ] Dropdown menu works (View, Process, Delete)
- [ ] Delete shows confirmation dialog (shadcn Dialog)
- [ ] Skeleton loading state shows during fetch
- [ ] Empty state renders when no recordings
- [ ] Error state renders with alert + retry
- [ ] Grid is responsive (1-4 columns)
- [ ] Click card navigates to viewer

### Files Modified
- `dashboard/src/pages/HomePage.jsx` (REWRITTEN)
- `dashboard/src/components/features/recording/RecordingCard.jsx` (REWRITTEN)
- `dashboard/src/components/features/recording/StatusBadge.jsx` (REWRITTEN)

### 21st.dev Magic MCP Usage
- Use `mcp__magic__21st_magic_component_inspiration` to get design ideas for:
  - Empty state illustration/layout
  - Recording card hover effects and visual hierarchy
  - Dashboard grid layout patterns

---

## Phase 4: ProcessModal Redesign

### Goal
Replace the hand-rolled modal with a polished shadcn Dialog + form components.

### Tasks

#### 4.1 Rewrite ProcessModal with shadcn Dialog
**Rewrite `src/components/features/processing/ProcessModal.jsx`:**
- `Dialog` with `open` controlled by parent, `onOpenChange` for close
- `DialogContent` with `max-w-lg`
- `DialogHeader` with `DialogTitle` ("Process Recording") + `DialogDescription` (recording title)
- Form body using shadcn form components:
  - **Whisper Model:** `Label` + `Select` (SelectTrigger/SelectContent/SelectItem)
  - **LLM Model:** `Label` + `Select` with dynamic items from API
  - **Provider indicator:** Show active provider name with `Badge`
  - **Skip options:** `Checkbox` + `Label` for each (skipTranscription, skipFrames, skipNotes)
- `DialogFooter` with Cancel (`Button variant="outline"`) + Process (`Button` with `Spinner` when loading)
- Loading state: `Skeleton` components while models fetch
- Use `toast()` from sonner for success/error feedback

### Verification Checklist
- [ ] Dialog opens and closes properly
- [ ] Model dropdowns populate from API
- [ ] Checkboxes toggle correctly
- [ ] Form submits and shows loading state
- [ ] Success toast appears on completion
- [ ] Error toast appears on failure
- [ ] Cancel button closes dialog
- [ ] Escape key closes dialog

### Files Modified
- `dashboard/src/components/features/processing/ProcessModal.jsx` (REWRITTEN)

### Documentation References
- shadcn Dialog: controlled `open` + `onOpenChange` pattern
- shadcn Select: SelectTrigger > SelectValue, SelectContent > SelectItem
- shadcn Checkbox: `checked` + `onCheckedChange` props

---

## Phase 5: ViewerPage Redesign

### Goal
Replace the artifact viewer with shadcn Tabs + Card + ScrollArea for a clean reading experience.

### Tasks

#### 5.1 Replace custom Tabs with shadcn Tabs
**Update `src/pages/ViewerPage.jsx`:**
- Use shadcn `Tabs` with `TabsList` + `TabsTrigger` for each artifact type
- `TabsContent` wraps each viewer (MarkdownViewer, TranscriptViewer)
- Controlled via `value` + `onValueChange`
- Tab items: Notes, Summary, Q&A, Transcript, Announcements (with icons)
- Wrap page in `Card` for cohesive look

#### 5.2 Redesign page header
- Back button: `Button variant="ghost"` with ArrowLeft icon
- Recording title + status badge
- Export button: `Button variant="outline"` with Download icon
- Video player in a `Card` with proper aspect ratio

#### 5.3 Improve TranscriptViewer with ScrollArea
**Update `src/components/features/viewer/TranscriptViewer.jsx`:**
- Wrap transcript in `ScrollArea` with max height
- Use `Card` for slide image containers
- Use `Collapsible` for expandable transcript chunks
- Better styling with shadcn `Separator` between sections

#### 5.4 Improve MarkdownViewer typography
**Update `src/components/features/viewer/MarkdownViewer.jsx`:**
- Keep react-markdown but improve wrapper styling
- Use shadcn's prose-compatible styles
- `ScrollArea` wrapper for long content

#### 5.5 Loading and empty states
- `Skeleton` for tab content while loading
- `Empty` state if artifact doesn't exist
- `Spinner` centered during initial page load

### Verification Checklist
- [ ] Tabs switch between artifact types
- [ ] Content loads and renders for each tab
- [ ] Back button navigates to home
- [ ] Export downloads the file
- [ ] Video player works
- [ ] Transcript viewer shows slides interleaved
- [ ] Skeleton loading visible during content fetch
- [ ] ScrollArea works for long content

### Files Modified
- `dashboard/src/pages/ViewerPage.jsx` (REWRITTEN)
- `dashboard/src/components/features/viewer/TranscriptViewer.jsx` (MODIFIED)
- `dashboard/src/components/features/viewer/MarkdownViewer.jsx` (MODIFIED)
- `dashboard/src/components/common/Tabs.jsx` (DELETED — replaced by shadcn Tabs)

---

## Phase 6: QueuePage Redesign

### Goal
Replace the queue display with a professional shadcn Table layout with real-time status updates.

### Tasks

#### 6.1 Rewrite QueuePage with shadcn Table
**Rewrite `src/pages/QueuePage.jsx`:**
- Section headers: "Active Jobs" and "Completed Jobs" using `h2` + `Separator`
- Use shadcn `Table` with columns: Recording, Status, Progress, Started, Message
- `Badge` for status in each row
- `Progress` component in progress column
- `Skeleton` rows during loading
- `Empty` component when queue is empty ("No jobs in queue")

#### 6.2 Rewrite QueueList as QueueTable
**Rewrite `src/components/features/queue/QueueList.jsx` → `QueueTable.jsx`:**
- `Table` > `TableHeader` > `TableRow` > `TableHead` (5 columns)
- `TableBody` > `TableRow` per item > `TableCell` per field
- Progress cell: `Progress value={item.progress}` + percentage text
- Status cell: `Badge` with variant mapping
- Time cell: formatted with date-fns `formatDistanceToNow`
- Hover rows for polish

### Verification Checklist
- [ ] Table renders queue items with all columns
- [ ] Progress bars animate
- [ ] Badge colors match status
- [ ] 3-second polling continues working
- [ ] Empty state shows when no jobs
- [ ] Loading skeleton visible on initial fetch
- [ ] Active and completed sections separate

### Files Modified
- `dashboard/src/pages/QueuePage.jsx` (REWRITTEN)
- `dashboard/src/components/features/queue/QueueList.jsx` → `QueueTable.jsx` (REWRITTEN + RENAMED)

---

## Phase 7: SearchPage Redesign

### Goal
Create a clean search experience with shadcn Input, Cards for results, and proper states.

### Tasks

#### 7.1 Redesign search form
**Rewrite `src/pages/SearchPage.jsx`:**
- `Input` with search icon (lucide Search) using input-group pattern or relative positioning
- `Button` for search action (variant="default")
- Or combine into a single row with `flex gap-2`
- Keyboard shortcut: Enter to search

#### 7.2 Redesign search results
- Each result in a `Card` with:
  - `CardHeader`: result title + type `Badge`
  - `CardContent`: snippet/excerpt text
  - `CardFooter`: recording link button
- Click card → navigate to recording viewer

#### 7.3 States
- `Spinner` during search
- `Empty` component for no results ("No results found for '{query}'")
- Initial state: centered search prompt
- `Skeleton` cards during loading

### Verification Checklist
- [ ] Search input renders with icon
- [ ] Enter key triggers search
- [ ] Results render as cards with type badges
- [ ] Click result navigates to viewer
- [ ] Loading spinner shows during search
- [ ] Empty state for no results
- [ ] Error handling with toast

### Files Modified
- `dashboard/src/pages/SearchPage.jsx` (REWRITTEN)

---

## Phase 8: SettingsPage Redesign

### Goal
Organize settings into clean Card sections with proper form components and toast feedback.

### Tasks

#### 8.1 LLM Provider Section
**Rewrite `src/pages/SettingsPage.jsx`:**
- **Provider Selection Card:**
  - `Card` with `CardHeader` ("LLM Provider") + `CardDescription`
  - `CardContent` with toggle group or radio-style `Button` group for Ollama / OpenAI
  - Active provider highlighted with `variant="default"`, inactive with `variant="outline"`

- **Provider Configuration Card:**
  - Ollama: `Label` + `Input` for Base URL
  - OpenAI: `Label` + `Input` (type="password") for API Key with show/hide `Button`
  - Connection status: `Badge` (green "Connected" / red "Disconnected")
  - "Test Connection" `Button variant="outline"` with `Spinner` while testing

- **Model Selection Card:**
  - `Label` + `Select` for model dropdown
  - Models fetched from active provider
  - `Skeleton` while loading models

#### 8.2 Appearance Section
- `Card` with `CardHeader` ("Appearance")
- `CardContent`: Dark mode row with `Label` + `Switch`
- `Separator` between settings rows

#### 8.3 Save + Feedback
- `Button` ("Save Settings") at bottom
- `toast.success("Settings saved")` / `toast.error("Failed to save")` via sonner
- Replace inline alert messages with toasts

### Verification Checklist
- [ ] Provider toggle switches between Ollama/OpenAI
- [ ] Provider-specific config fields show/hide
- [ ] API key show/hide toggle works
- [ ] Test connection button works with loading state
- [ ] Model dropdown populates
- [ ] Dark mode switch toggles theme
- [ ] Save button persists settings
- [ ] Toast notifications for save/error/test results
- [ ] Connection status badges update

### Files Modified
- `dashboard/src/pages/SettingsPage.jsx` (REWRITTEN)

---

## Phase 9: Global Polish & Dark Mode

### Goal
Final pass for consistency, animations, responsive design, dark mode, and notification system.

### Tasks

#### 9.1 Toast Notifications Everywhere
- Replace all `window.alert()` / inline error messages with `toast()`:
  - HomePage: delete success/error
  - ProcessModal: process started / error
  - SettingsPage: save success / test result
  - SearchPage: search error
  - QueuePage: any errors

#### 9.2 Consistent Loading States
- Every page: `Skeleton` during initial data fetch
- Every action button: `Spinner` + disabled state during async ops
- ProcessModal: `Skeleton` while models load

#### 9.3 Dark Mode Polish
- Verify all shadcn components respect `dark:` class
- Test every page in dark mode
- Ensure Notion theme CSS variables map correctly in dark mode
- Fix any contrast issues

#### 9.4 Responsive Design
- Sidebar: auto-collapse on mobile (use `SidebarProvider` responsive behavior)
- Home grid: 1 col mobile → 4 col desktop
- ViewerPage: stack video + tabs vertically on mobile
- SettingsPage: full-width cards on mobile
- All modals: mobile-friendly sizing

#### 9.5 Animations & Transitions
- Page transitions: subtle fade-in for page content
- Card hover: `hover:shadow-md transition-shadow`
- Sidebar collapse: smooth animation (built into shadcn Sidebar)
- Progress bars: `transition-all duration-500`
- Badge/status changes: subtle color transitions

#### 9.6 Delete App.css
- Remove `src/App.css` (legacy Vite boilerplate, unused)
- Remove import from `App.jsx`

#### 9.7 Use 21st.dev Magic for Visual Polish
- Use `mcp__magic__21st_magic_component_refiner` to refine:
  - RecordingCard visual hierarchy
  - SettingsPage form layout
  - Empty state designs
- Use `mcp__magic__21st_magic_component_inspiration` for:
  - Dashboard overview layout ideas
  - Professional color palette refinements

### Verification Checklist
- [ ] No `window.alert()` calls remain in codebase
- [ ] All pages have skeleton loading states
- [ ] Dark mode works on every page
- [ ] Responsive layout works at 375px, 768px, 1024px, 1440px
- [ ] No console errors or warnings
- [ ] All API calls have error handling with toasts
- [ ] App.css deleted, no orphan imports
- [ ] Smooth sidebar collapse/expand animation

### Files Modified
- `dashboard/src/App.jsx` (MODIFIED — remove App.css import, ensure Toaster)
- `dashboard/src/App.css` (DELETED)
- `dashboard/src/index.css` (REFINED — final dark mode polish)
- All page files (MODIFIED — toast integration, skeleton states)

---

## Phase 10: Verification & Cleanup

### Goal
Final verification that everything works, no broken imports, no dead code.

### Tasks

#### 10.1 Dead Code Cleanup
- `grep -r` for any remaining imports of deleted files (Sidebar.jsx, Tabs.jsx, QueueList.jsx)
- Remove any unused CSS classes from index.css
- Remove any unused dependencies from package.json

#### 10.2 Import Consistency Check
- All shadcn imports use `@/components/ui/<name>` pattern
- No relative imports to `../../components/ui/`
- All lucide-react icons imported consistently

#### 10.3 Full Manual Test
- [ ] Navigate all 5 pages
- [ ] Process a recording (full flow)
- [ ] View artifacts (all 5 tabs)
- [ ] Search for content
- [ ] Change settings (switch provider, save)
- [ ] Toggle dark mode
- [ ] Collapse/expand sidebar
- [ ] Delete a recording
- [ ] Check queue with active job
- [ ] Export recording
- [ ] Test on mobile viewport

#### 10.4 Build Verification
```bash
cd /Users/satish/projects/Scaler-Companion/dashboard
npm run build
```
- No build errors
- No TypeScript/lint warnings
- Bundle size check

### Files Modified
- Various cleanup edits across all files
- `dashboard/package.json` (cleanup unused deps)

---

## Execution Summary

| Phase | Scope | Est. Files Changed |
|-------|-------|--------------------|
| 1 | Foundation Setup | ~30 new files (shadcn components) + 4 modified |
| 2 | Layout & Navigation | 4 files (2 new, 1 rewrite, 1 delete) |
| 3 | HomePage | 3 files (all rewritten) |
| 4 | ProcessModal | 1 file (rewritten) |
| 5 | ViewerPage | 4 files (1 rewrite, 2 modify, 1 delete) |
| 6 | QueuePage | 2 files (both rewritten) |
| 7 | SearchPage | 1 file (rewritten) |
| 8 | SettingsPage | 1 file (rewritten) |
| 9 | Global Polish | ~10 files (modifications) |
| 10 | Verification | Cleanup only |

### Component Mapping (Old → New)

| Old Component | New Component | shadcn Used |
|---------------|---------------|-------------|
| `Sidebar.jsx` | `AppSidebar.jsx` | Sidebar, SidebarMenu, SidebarMenuButton, Tooltip |
| `Layout.jsx` | `Layout.jsx` | SidebarProvider, SidebarInset |
| — (new) | `SiteHeader.jsx` | Breadcrumb, Separator, Button |
| `RecordingCard.jsx` | `RecordingCard.jsx` | Card, Badge, Progress, DropdownMenu |
| `StatusBadge.jsx` | `StatusBadge.jsx` | Badge |
| `ProcessModal.jsx` | `ProcessModal.jsx` | Dialog, Select, Checkbox, Label, Button, Spinner |
| `Tabs.jsx` | — (deleted) | shadcn Tabs used directly in ViewerPage |
| `QueueList.jsx` | `QueueTable.jsx` | Table, Progress, Badge |
| — (inline) | — (inline) | Skeleton, Empty, Alert, Sonner/toast |
