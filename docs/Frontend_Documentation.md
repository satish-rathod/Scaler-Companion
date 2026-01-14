# Scaler Companion - Frontend (Dashboard) Documentation

## 1. Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI library |
| Vite | 5.x | Build tool |
| React Router | 6.x | Client-side routing |
| Tailwind CSS | 4.x | Styling |
| Lucide React | latest | Icons |
| React Markdown | latest | Render .md content |

---

## 2. Project Structure

```
dashboard/
├── index.html              # Entry HTML
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind customization
├── package.json
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Router + layout
    ├── App.css             # App-level styles
    ├── index.css           # Tailwind imports + global
    ├── pages/
    │   ├── HomePage.jsx    # Recording library
    │   ├── QueuePage.jsx   # Processing queue
    │   └── RecordingPage.jsx  # Recording detail
    ├── components/
    │   └── FlashcardViewer.jsx  # Q&A card component
    └── assets/
```

---

## 3. Routing

```jsx
// App.jsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/queue" element={<QueuePage />} />
    <Route path="/recording/:id" element={<RecordingPage />} />
  </Routes>
</BrowserRouter>
```

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Recording library grid |
| `/queue` | QueuePage | Processing queue status |
| `/recording/:id` | RecordingPage | Single recording viewer |

---

## 4. Component Architecture

### 4.1 App Layout

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (fixed)           │  Main Content          │
│  ┌───────────────────┐     │  ┌───────────────────┐ │
│  │ Lecture Companion │     │  │                   │ │
│  │ AI-powered study  │     │  │   <Routes />      │ │
│  │                   │     │  │                   │ │
│  │ ◉ Library         │     │  │                   │ │
│  │ ○ Processing      │     │  │                   │ │
│  │                   │     │  │                   │ │
│  │ v1.0.0            │     │  │                   │ │
│  └───────────────────┘     │  └───────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 4.2 HomePage

```jsx
function HomePage() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Fetch recordings on mount
  useEffect(() => {
    fetchRecordings();
  }, []);

  // Filter by search
  const filtered = recordings.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <SearchBar value={search} onChange={setSearch} />
      <RecordingGrid recordings={filtered} />
    </>
  );
}
```

**Recording Card States:**
| Status | Visual | Actions |
|--------|--------|---------|
| `downloaded` | Yellow badge | Process |
| `processing` | Spinner + progress | View Queue |
| `processed` | Green badge | View Notes |

### 4.3 RecordingPage

```jsx
function RecordingPage() {
  const { id } = useParams();
  const [recording, setRecording] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [content, setContent] = useState('');

  // Tabs
  const tabs = [
    { id: 'notes', label: 'Lecture Notes', icon: FileText },
    { id: 'summary', label: 'Summary', icon: BookOpen },
    { id: 'qa_cards', label: 'Flashcards', icon: MessageSquare },
    { id: 'transcript', label: 'Transcript', icon: AlignLeft },
  ];

  // Fetch content when tab changes
  useEffect(() => {
    fetchContent(activeTab);
  }, [activeTab]);

  return (
    <>
      <BackButton />
      <Title>{recording?.title}</Title>
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
      <ContentArea>
        {activeTab === 'qa_cards' ? (
          <FlashcardViewer content={content} />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        )}
      </ContentArea>
    </>
  );
}
```

### 4.4 FlashcardViewer

```jsx
function FlashcardViewer({ content }) {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Parse Q&A markdown into cards
  useEffect(() => {
    const parsed = parseQACards(content);
    setCards(parsed);
  }, [content]);

  return (
    <div className="flashcard-container">
      <Card 
        question={cards[currentIndex]?.question}
        answer={cards[currentIndex]?.answer}
        flipped={flipped}
        onFlip={() => setFlipped(!flipped)}
      />
      <Navigation
        current={currentIndex}
        total={cards.length}
        onPrev={() => { setCurrentIndex(i => i - 1); setFlipped(false); }}
        onNext={() => { setCurrentIndex(i => i + 1); setFlipped(false); }}
      />
    </div>
  );
}
```

---

## 5. API Integration

### 5.1 API Base URL

```javascript
// Vite dev server proxies /api to backend
const API_BASE = '/api';

// Or direct in production
const API_BASE = 'http://localhost:8000/api';
```

### 5.2 API Calls

```javascript
// Fetch all recordings
async function fetchRecordings() {
  const res = await fetch(`${API_BASE}/recordings`);
  const { recordings } = await res.json();
  return recordings;
}

// Start processing
async function startProcessing(recording) {
  const res = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: recording.title,
      videoPath: recording.videoPath,
      whisperModel: 'medium',
      ollamaModel: 'gpt-oss:20b'
    })
  });
  return res.json();
}

// Fetch artifact content
async function fetchContent(recordingId, artifact) {
  const url = `/content/${recordingId}/${artifact}.md`;
  const res = await fetch(url);
  return res.text();
}
```

---

## 6. Styling

### 6.1 Tailwind Configuration

```javascript
// tailwind.config.js
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#121212',
        foreground: '#ffffff',
        muted: '#a0a0a0',
        accent: '#2d2d2d',
        border: '#333333',
      }
    }
  }
}
```

### 6.2 Global Styles

```css
/* index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-background text-foreground;
}

.markdown-content h1 { @apply text-2xl font-bold mb-4; }
.markdown-content h2 { @apply text-xl font-semibold mb-3; }
.markdown-content table { @apply w-full border-collapse; }
.markdown-content th { @apply border border-border p-2 bg-accent; }
```

---

## 7. Build & Deploy

### 7.1 Development

```bash
cd dashboard
npm run dev
# Opens http://localhost:5173
```

### 7.2 Production Build

```bash
npm run build
# Output: dashboard/dist/
```

### 7.3 Vite Proxy (Dev)

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/content': 'http://localhost:8000'
    }
  }
});
```

---

*Document Version: 1.0 | Last Updated: 2026-01-14*
