# MITM Navigo - Indoor Campus Navigation & Ask Navigo Assistant
**Maharaja Institute of Technology Mysore (MITM)**

MITM Navigo is the visual wayfinding and indoor corridor navigation system built for Maharaja Institute of Technology Mysore. It guides students, faculty, and visitors through step-by-step corridor photographs directly to 123 classrooms, labs, seminar halls, and departments across all academic blocks.

Included with the navigation suite is **Ask Navigo**, a zero-AI, offline-first client-side chatbot and student assistant.

---

## Ask Navigo Chatbot Architecture

Ask Navigo adheres strictly to hard constraints:
- **Zero AI / LLM models**: No external neural network API dependencies, no subscriptions, no rate limit failures, and zero cost.
- **Offline-First Local Knowledge**: Instant client-side intent routing for campus locations, 80+ student programming snippets, unit conversions, and mathematical expressions.
- **Fair-Use Keyless APIs**: Real-time Mysore weather via Open-Meteo, dictionary definitions via Wiktionary REST, and encyclopedic lookups via Wikipedia REST.
- **Smart Client-Side Caching**: 24-hour localStorage caching for encyclopedia summaries, definitions, and code lookups; 30-minute caching for weather forecasts.
- **Safe HTML & XSS Mitigation**: Strict text escaping, sanitized markdown-lite rendering, and HTTPS-only external linking.

### Intent Router Flow

1. **Small Talk & Greetings**: Local answers with prompt suggestion chips ("Where is MCA Lab 1", "Belaku auditorium", "Weather in Mysore", "Fibonacci in Python").
2. **Campus Directory (Strictly Local)**: Queries `campus-data.json` and `rooms_data.json` for 5 academic blocks and 123 rooms. Never hits the internet. Renders direct action buttons such as "Enter Engineering Block" or "Open Walkthrough 117".
3. **Maths & Conversions**: Powered by Math.js CDN. Evaluates arithmetic expressions (`2+2*5`), square roots (`sqrt(144)`), percentages (`15% of 800`), and unit conversions (`10 km to miles`).
4. **Time & Date**: Uses browser clock and timezone detection (`Asia/Kolkata`).
5. **Weather**: Open-Meteo Geocoding and Forecast API. Automatically maps WMO condition codes to English text (e.g., Overcast, Clear sky, Rain showers). Defaults to Mysore.
6. **Definitions**: Wiktionary REST API for parts of speech and first two definitions.
7. **Side-by-Side Comparisons**: Parses "difference between X and Y" and displays comparison summaries side by side.
8. **Coding Help (Local First)**:
   - Queries `code-snippets.json` containing 120+ student programs in Python, Java, C, C++, SQL, and Web development.
   - Highlights syntax using Highlight.js with language tag and Copy button.
   - Falls back to MDN Web Docs search API for web topics, and Wikipedia for theoretical computer science concepts (e.g., polymorphism, deadlock).
9. **Fallback**: Displays "I couldn't find an exact answer for that..." with a direct Google Search button and 3 suggestion pills.

---

## Deployment on Vercel

MITM Navigo is configured for instant deployment on Vercel:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy MITM Navigo with Ask Navigo chatbot"
   git push origin main
   ```
2. **Connect to Vercel**:
   - Import the repository into your Vercel Dashboard.
   - Framework Preset: **Other** (Static HTML/JS).
   - Root Directory: `./`
3. **Serverless Functions**:
   - `/api/cheat.js` automatically runs as a Node.js serverless proxy on Vercel for cheat.sh syntax queries with CORS and a 5-second timeout.
4. **Offline PWA Support**:
   - Service worker `sw.js` caches `index.html`, `chatbot.js`, `campus-data.json`, `code-snippets.json`, and all corridor media for offline use.

---

## How to Edit Campus Data

Campus information is stored in human-readable JSON at `campus-data.json`:
- **Academic Blocks**: Under `"blocks"`, add new buildings with `id`, `name`, `aliases`, `departments`, and `link`.
- **Hotspots & Auditoriums**: Under `"hotspots"`, add entries with `name`, `aliases`, `block`, `location`, `description`, and `link`.
- **App Features**: Under `"app_features"`, add guidance entries with `keywords`, `title`, `description`, and `action`.

Room details (123 rooms) are indexed in `rooms_data.json` and `rooms_data.js`.

---

## How to Add New Code Snippets

Code snippets are stored in `code-snippets.json`:
```json
{
  "title": "Breadth First Search (BFS) in Python",
  "language": "python",
  "tags": ["bfs", "breadth first search", "graph", "queue", "traversal"],
  "description": "BFS traverses a graph level by level using a queue data structure.",
  "code": "from collections import deque\n\ndef bfs(graph, start):\n    visited = set([start])\n    queue = deque([start])\n    while queue:\n        vertex = queue.popleft()\n        print(vertex, end=' ')\n        for neighbor in graph[vertex]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)"
}
```

You can also run `node build_snippets.js` to batch rebuild snippets.

---

## 15-Point Acceptance Test Results

Run `npm test` or `node test_chatbot.js` to verify all 15 test queries:

| No. | Test Query | Detected Intent | Status | Source & Result |
|---|---|---|---|---|
| 1 | "where is MCA lab" | campus | PASS | `campus-data.json` -> Department of MCA |
| 2 | "belaku auditorium" | campus | PASS | `campus-data.json` / `rooms_data.json` -> Belaku Auditorium |
| 3 | "2+2*5" | math | PASS | Math Engine -> 12 |
| 4 | "15% of 800" | math | PASS | Math Engine -> 120 |
| 5 | "what time is it" | time_date | PASS | Browser Clock -> Formatted local time |
| 6 | "weather in Mysore" | weather | PASS | Open-Meteo -> Mysore temperature & weather condition |
| 7 | "meaning of ephemeral" | definition | PASS | Wiktionary -> Adjective definition |
| 8 | "who is APJ Abdul Kalam" | general_knowledge | PASS | Wikipedia -> Dr. A. P. J. Abdul Kalam biographical summary |
| 9 | "difference between RAM and ROM" | comparison | PASS | Wikipedia -> Side-by-side comparison of Random-access memory and Read-only memory |
| 10 | "fibonacci in python" | coding | PASS | Local Code Library -> Python Fibonacci program |
| 11 | "reverse a string in java" | coding | PASS | Local Code Library -> Java String reverse program |
| 12 | "sql inner join example" | coding | PASS | Local Code Library -> SQL INNER JOIN example |
| 13 | "what is polymorphism" | general_knowledge | PASS | Wikipedia -> Polymorphism (computer science) summary |
| 14 | "difference between let and var" | comparison | PASS | Local Code Library -> Difference between let, var, and const in JavaScript |
| 15 | "flabbergasted wookiebomb zzzq123" | fallback | PASS | Navigo Fallback -> Web search button with suggestion chips |

**Overall Result: 15 / 15 Passed (100%)**

---

## Honest Evaluation of Question Types

### What Works Very Well
- **Campus Questions**: Instant (<5ms), zero network reliance. Any room number (e.g., 117, 205, 301) or facility name (Belaku, MCA Lab, MBA, Principal Office) immediately surfaces room information with a one-click corridor walkthrough button.
- **Maths & Conversions**: Instant and robust across basic arithmetic, order of operations, trigonometric functions, percentage expressions (`X% of Y`), and distance/mass unit conversions.
- **Common Coding Queries**: For standard academic syllabus topics (Fibonacci, factorial, prime, palindrome, sorting, binary search, linked lists, SQL joins, CRUD, OOP basics), local retrieval is immediate (<10ms) and provides complete, syntactically styled code with copy-to-clipboard functionality.
- **Weather & Definitions**: Open-Meteo and Wiktionary APIs return clean, accurate responses with zero billing or API keys.

### What Needs Future Curation
- **Complex Multi-Word Campus Slang**: While official names, room numbers, and department aliases are covered, colloquial nicknames (e.g. "maggi hotspot", "back gate chai") require adding to `"aliases"` in `campus-data.json`.
- **Advanced Framework Coding Questions**: For advanced framework code (e.g., specific React 19 server actions, Kubernetes YAML), cheat.sh or MDN fallback is relied upon when online; adding more specialized full-stack snippets to `code-snippets.json` will make those work offline as well.
