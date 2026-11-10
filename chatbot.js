// MITM Navigo Chatbot Engine
// Zero AI / LLM - Strictly local knowledge bases, rule-based intent router, and free keyless public APIs
// Maharaja Institute of Technology Mysore (MITM)

(function (window, document) {
  'use strict';

  // Constants
  const STORAGE_KEYS = {
    HISTORY: 'navigo_chat_history',
    FEEDBACK: 'navigo_chat_feedback',
    CACHE_PREFIX: 'navigo_cache_',
    PREFERRED_LANG: 'navigo_preferred_lang'
  };

  const USER_AGENT_HEADER = {
    'User-Agent': 'MITMNavigoBot/1.0 (https://mitm-room.vercel.app; navigo-bot@mitm.edu)',
    'Api-User-Agent': 'MITMNavigoBot/1.0'
  };

  const CACHE_TTL_DEFAULT = 24 * 60 * 60 * 1000; // 24 hours
  const CACHE_TTL_WEATHER = 30 * 60 * 1000;      // 30 minutes

  // In-memory data stores
  let campusData = null;
  let codeSnippets = null;
  let isAwaitingResponse = false;
  let activeLanguage = localStorage.getItem(STORAGE_KEYS.PREFERRED_LANG) || 'python';

  // WMO Weather code dictionary
  const WMO_WEATHER_CODES = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    62: 'Moderate rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };

  // Pre-load local JSON datasets
  async function loadCampusData() {
    if (campusData) return campusData;
    try {
      const res = await fetch('campus-data.json');
      if (res.ok) {
        campusData = await res.json();
      }
    } catch (e) {
      console.warn('Campus data could not be loaded from file, using fallback cache');
    }
    return campusData;
  }

  async function loadCodeSnippets() {
    if (codeSnippets) return codeSnippets;
    try {
      const res = await fetch('code-snippets.json');
      if (res.ok) {
        codeSnippets = await res.json();
      }
    } catch (e) {
      console.warn('Code snippets could not be loaded from file');
    }
    return codeSnippets;
  }

  // Cache helper with TTL
  function getCached(key) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CACHE_PREFIX + key);
      if (!raw) return null;
      const record = JSON.parse(raw);
      if (Date.now() > record.expiry) {
        localStorage.removeItem(STORAGE_KEYS.CACHE_PREFIX + key);
        return null;
      }
      return record.value;
    } catch (e) {
      return null;
    }
  }

  function setCached(key, value, ttl = CACHE_TTL_DEFAULT) {
    try {
      const record = {
        value: value,
        expiry: Date.now() + ttl
      };
      localStorage.setItem(STORAGE_KEYS.CACHE_PREFIX + key, JSON.stringify(record));
    } catch (e) {
      // LocalStorage quota might be full; gracefully ignore
    }
  }

  // Text normalization & fuzzy matching
  function normalizeText(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/^(can you please tell me|could you please tell me|please tell me|can you tell me|tell me about|tell me|what is the|what are the|can you give me|give me|show me|explain to me|explain|please|hey navigo|navigo)\s+/i, '')
      .replace(/[?!.,;:]+$/, '')
      .trim();
  }

  function levenshteinDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  function similarityRatio(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    const dist = levenshteinDistance(longer, shorter);
    return (longer.length - dist) / longer.length;
  }

  function tokenOverlap(query, target) {
    const qTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const tTokens = target.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (!qTokens.length || !tTokens.length) return 0;
    let matches = 0;
    for (const q of qTokens) {
      if (tTokens.some(t => t.includes(q) || q.includes(t) || similarityRatio(q, t) > 0.75)) {
        matches++;
      }
    }
    return matches / qTokens.length;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Safe markdown-lite renderer
  function renderMarkdownLite(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    // Code blocks with syntax highlighting
    html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gi, function (_, lang, code) {
      const languageClass = lang ? `language-${escapeHtml(lang)}` : 'nohighlight';
      const unescapedCode = code
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      let highlighted = escapeHtml(unescapedCode);
      if (window.hljs) {
        try {
          if (lang && window.hljs.getLanguage(lang)) {
            highlighted = window.hljs.highlight(unescapedCode, { language: lang }).value;
          } else {
            highlighted = window.hljs.highlightAuto(unescapedCode).value;
          }
        } catch (e) {
          highlighted = escapeHtml(unescapedCode);
        }
      }

      return `<div class="navigo-code-wrapper">
        <div class="navigo-code-header">
          <span class="navigo-code-lang">${escapeHtml(lang || 'code')}</span>
          <button class="navigo-copy-btn" onclick="window.NavigoChatbot.copyCode(this)">Copy</button>
        </div>
        <pre><code class="${languageClass}">${highlighted}</code></pre>
      </div>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Markdown links (only https://)
    html = html.replace(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Unordered lists
    html = html.replace(/(?:^|\n)[*-]\s+(.+)/g, '<li class="navigo-chat-li">$1</li>');
    html = html.replace(/(<li class="navigo-chat-li">.*<\/li>)/gs, '<ul class="navigo-chat-ul">$1</ul>');

    // Paragraph breaks
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br/>');

    return `<p>${html}</p>`.replace(/<p><\/p>/g, '');
  }

  // STEP 1: Intent Classifier
  function classifyIntent(norm, raw) {
    // 1. Small talk & Greetings
    if (/^(hi|hello|hey|namaste|vanakkam|good\s*(morning|afternoon|evening)|howdy|sup)\b/i.test(norm)) {
      return { intent: 'greeting', type: 'hello' };
    }
    if (/^(who are you|what are you|your name|what is your name)\b/i.test(norm)) {
      return { intent: 'greeting', type: 'identity' };
    }
    if (/^(what can you do|help|how to use|features|commands|capabilities)\b/i.test(norm)) {
      return { intent: 'greeting', type: 'help' };
    }
    if (/^(thanks|thank you|thx|cheers|awesome|great job|good job)\b/i.test(norm)) {
      return { intent: 'greeting', type: 'thanks' };
    }
    if (/^(bye|goodbye|see you|exit|quit|cya)\b/i.test(norm)) {
      return { intent: 'greeting', type: 'bye' };
    }

    // 2. Math & Conversions
    if (
      /^[0-9\s.+\-*/^%()=]+$/.test(norm) ||
      /\b(\d+(?:\.\d+)?)\s*%\s*(?:of)\s*(\d+(?:\.\d+)?)\b/i.test(norm) ||
      /\b(sqrt|sin|cos|tan|log|pow|abs)\s*\(/i.test(norm) ||
      /\b\d+(?:\.\d+)?\s*(?:km|miles|kg|lbs|celsius|fahrenheit|cm|inches|meters|feet)\s+to\s+(?:km|miles|kg|lbs|celsius|fahrenheit|cm|inches|meters|feet)\b/i.test(norm)
    ) {
      return { intent: 'math', query: norm };
    }

    // 3. Time & Date
    if (
      /\b(what\s+time\s+is\s+it|current\s+time|time\s+now|what\s+is\s+the\s+time|today'?s\s+date|what\s+is\s+today'?s\s+date|what\s+day\s+is\s+it|what\s+is\s+the\s+day\s+today)\b/i.test(norm)
    ) {
      return { intent: 'time_date', query: norm };
    }

    // 4. Weather
    if (/\b(weather|temperature|forecast|rain today|how hot|how cold|climate)\b/i.test(norm)) {
      return { intent: 'weather', query: norm };
    }

    // 5. Definitions
    if (/^(meaning of|define|definition of|what is the meaning of)\s+([a-z\s-]+)$/i.test(norm)) {
      const match = norm.match(/^(?:meaning of|define|definition of|what is the meaning of)\s+([a-z\s-]+)$/i);
      return { intent: 'definition', word: match[1].trim() };
    }

    // 6. Difference between X and Y (Comparison)
    if (/\b(?:difference between|compare|difference in|vs|versus)\s+(.+?)\s+(?:and|vs|versus|to)\s+(.+)/i.test(norm)) {
      const m = norm.match(/\b(?:difference between|compare|difference in|vs|versus)\s+(.+?)\s+(?:and|vs|versus|to)\s+(.+)/i);
      return { intent: 'comparison', itemA: m[1].trim(), itemB: m[2].trim(), rawQuery: norm };
    }

    // 7. Campus Knowledge Base (strictly offline, never internet)
    const campusKeywords = [
      'mca', 'mba', 'engineering', 'bca', 'pharmacy', 'belaku', 'auditorium',
      'corridor', 'hotspot', 'department', 'block', 'wing', 'floor', 'ground',
      'first floor', 'second floor', 'third floor', 'principal', 'office',
      'board room', 'placement', 'future skills', 'library', 'canteen', 'lab',
      'lh', 'lecture hall', 'ayurveda', 'clinic', 'mitm', 'mysore campus'
    ];
    const isCampusExplicit = campusKeywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(norm));
    
    // Explicit room number match: e.g. "room 117", "lab 1", or standalone 3-digit number like "117" or "205"
    let roomMatch = norm.match(/\b(?:room|lab|cabin|office|lh|hall|no\.?|#)\s*([0-9]{1,3}[a-z]?)\b/i);
    if (!roomMatch) {
      roomMatch = norm.match(/\b(1[0-9]{2}|2[0-9]{2}|3[0-9]{2})\b/);
    }

    if (isCampusExplicit || (roomMatch && roomMatch[1])) {
      return { intent: 'campus', query: norm, roomKey: roomMatch ? roomMatch[1] : null };
    }

    // 8. Coding Help
    const codeLangs = ['python', 'java', 'c++', 'cpp', 'javascript', 'js', 'html', 'css', 'sql', 'react'];
    const codeKeywords = [
      'code', 'program', 'snippet', 'function', 'syntax', 'algorithm', 'loop', 'array',
      'fibonacci', 'factorial', 'palindrome', 'prime', 'armstrong', 'reverse', 'swap',
      'sorting', 'binary search', 'linked list', 'stack', 'queue', 'tree', 'join', 'select',
      'query', 'group by', 'css layout', 'flexbox', 'grid', 'dom', 'button'
    ];
    const hasCodeLang = codeLangs.some(lang => new RegExp(`\\b${lang.replace('+', '\\+')}\\b`, 'i').test(norm));
    const hasCodeWord = codeKeywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(norm));

    // Concept questions like "what is polymorphism", "what is a deadlock" go to Wikipedia (Step 2 H.4)
    const csConcepts = ['polymorphism', 'deadlock', 'encapsulation', 'inheritance', 'semaphore', 'process vs thread'];
    if (csConcepts.some(c => norm.includes(c))) {
      return { intent: 'general_knowledge', topic: norm };
    }

    if (hasCodeLang || hasCodeWord) {
      return { intent: 'coding', query: norm };
    }

    // 9. General Knowledge (Wikipedia)
    if (/^(who is|who was|what is|what are|where is|when did|history of|tell me about)\s+(.+)/i.test(norm)) {
      const m = norm.match(/^(?:who is|who was|what is|what are|where is|when did|history of|tell me about)\s+(.+)/i);
      return { intent: 'general_knowledge', topic: m[1].trim() };
    }

    // Fallback intent
    return { intent: 'fallback', query: norm };
  }

  // STEP 2: Answer Handlers

  // A) Greetings & Small Talk
  function handleGreeting(intentData) {
    let reply = '';
    const chips = [
      'Where is MCA Lab 1',
      'Belaku auditorium',
      'Weather in Mysore',
      'Fibonacci in Python',
      'Difference between RAM and ROM',
      '15% of 800'
    ];

    switch (intentData.type) {
      case 'hello':
        reply = 'Hello! I am **Navigo**, your intelligent assistant for Maharaja Institute of Technology Mysore (MITM). How can I assist your campus navigation, code learning, or calculations today?';
        break;
      case 'identity':
        reply = 'I am **Navigo**, built specifically for MITM Mysore students, faculty, and visitors. I work completely offline for campus navigation and code snippets, plus keyless instant lookup for weather, definitions, and encyclopedia topics.';
        break;
      case 'help':
        reply = 'Here is everything I can do for you:\n\n' +
          '* **Campus Navigation**: Find departments, auditoriums, labs, and all 123 MITM rooms with one-click walkthroughs.\n' +
          '* **Coding Snippets**: 80+ student programs in Python, Java, C, C++, SQL, and Web.\n' +
          '* **Maths & Conversions**: Instant calculations, percentages, and unit conversions.\n' +
          '* **Time & Weather**: Real-time Mysore weather and timezone clock.\n' +
          '* **Definitions & Wikipedia**: Instant dictionary and encyclopedia summaries.';
        break;
      case 'thanks':
        reply = 'You are very welcome! Let me know if you need any other rooms or study help.';
        break;
      case 'bye':
        reply = 'Goodbye! Have a productive and wonderful day at MIT Mysore!';
        break;
      default:
        reply = 'Hello! How can I assist you with MITM campus or coding today?';
    }

    return {
      text: reply,
      chips: chips,
      source: 'Navigo Local'
    };
  }

  // B) Campus Knowledge Base (Local only, never internet)
  async function handleCampus(intentData) {
    const data = await loadCampusData();
    const query = intentData.query.toLowerCase();

    // 1. Check if user asked about a specific room key (e.g. "117", "205", "MCA Lab 1")
    let targetRoom = null;
    const roomsMap = window.ROOMS_DATA || window.LOCOROM_DATA || null;

    if (roomsMap && intentData.roomKey && roomsMap[intentData.roomKey]) {
      targetRoom = { id: intentData.roomKey, data: roomsMap[intentData.roomKey] };
    } else if (roomsMap) {
      // Search rooms data by label or room name with word boundary
      for (const [key, val] of Object.entries(roomsMap)) {
        const label = (val.label || '').toLowerCase();
        const num = (val.room_number || '').toLowerCase();
        
        // Exact number match or word match
        const hasKeyMatch = new RegExp(`\\b${key}\\b`, 'i').test(query);
        const hasNumMatch = num && new RegExp(`\\b${num}\\b`, 'i').test(query);
        const hasLabelMatch = label && query.includes(label);

        if (hasKeyMatch || hasNumMatch || hasLabelMatch) {
          targetRoom = { id: key, data: val };
          break;
        }
      }
    }

    if (targetRoom) {
      const r = targetRoom.data;
      const roomNum = r.room_number || targetRoom.id;
      const label = r.label || `Room ${roomNum}`;
      const floor = r.floor || 'Campus Building';
      const stepsCount = (r.access_points && r.access_points[0] && r.access_points[0].steps) ? r.access_points[0].steps.length : 'Multiple';

      return {
        text: `**${label}**\n\n` +
          `* **Room Number**: ${roomNum}\n` +
          `* **Floor / Level**: ${floor}\n` +
          `* **Navigation Steps**: ${stepsCount} photographic corridor steps available.\n\n` +
          `Click below to launch the photo step-by-step route right away.`,
        actions: [
          {
            title: `Open Walkthrough ${roomNum}`,
            action: `openRoom('${targetRoom.id}')`,
            type: 'primary'
          }
        ],
        source: 'MITM Campus Database'
      };
    }

    // 2. Search campus-data.json
    if (data) {
      // Search blocks
      if (data.blocks) {
        for (const block of data.blocks) {
          const matchAlias = block.aliases && block.aliases.some(a => query.includes(a.toLowerCase()));
          const matchName = query.includes(block.name.toLowerCase());
          if (matchAlias || matchName) {
            let deptList = '';
            if (block.departments && block.departments.length) {
              deptList = '\n\n**Departments & Facilities:**\n' + block.departments.map(d => `* ${d}`).join('\n');
            }
            return {
              text: `**${block.name}**\n\n${block.description}${deptList}`,
              actions: [
                {
                  title: `Enter ${block.name}`,
                  action: block.link ? `navigateUrl('${block.link}')` : `enterCollege('${block.id}')`,
                  type: 'primary'
                }
              ],
              source: 'MITM Campus Directory'
            };
          }
        }
      }

      // Search hotspots
      if (data.hotspots) {
        for (const spot of data.hotspots) {
          const matchAlias = spot.aliases && spot.aliases.some(a => query.includes(a.toLowerCase()));
          const matchName = query.includes(spot.name.toLowerCase());
          if (matchAlias || matchName) {
            return {
              text: `**${spot.name}**\n\n` +
                `* **Block**: ${spot.block}\n` +
                `* **Location**: ${spot.location}\n\n` +
                `${spot.description}`,
              actions: [
                {
                  title: `Enter ${spot.block}`,
                  action: `navigateUrl('${spot.link}')`,
                  type: 'primary'
                }
              ],
              source: 'MITM Campus Directory'
            };
          }
        }
      }

      // Search app features
      if (data.app_features) {
        for (const feat of data.app_features) {
          const matchKeyword = feat.keywords && feat.keywords.some(k => query.includes(k.toLowerCase()));
          const matchTitle = query.includes(feat.title.toLowerCase());
          if (matchKeyword || matchTitle) {
            return {
              text: `**${feat.title}**\n\n${feat.description}`,
              actions: [
                {
                  title: 'Explore Feature',
                  action: `navigateUrl('${feat.action}')`,
                  type: 'primary'
                }
              ],
              source: 'MITM Navigo Guide'
            };
          }
        }
      }
    }

    // Default campus response if specific item wasn't matched
    return {
      text: 'MITM campus features 5 academic blocks:\n\n' +
        '* **Engineering Academic Block**: CSE, ISE, ECE, Mechanical, Civil, AI & DS.\n' +
        '* **Department of MBA**: Belaku auditorium, Centre for Future Skills, Board Room.\n' +
        '* **Department of MCA**: MCA Labs, Lecture Halls LH 1 to 4.\n' +
        '* **Department of BCA**: Coding studios and web technology labs.\n' +
        '* **Faculty of Pharmaceutical Sciences**: Research labs and clinic.\n\n' +
        'Which block or room would you like to explore?',
      chips: ['Belaku auditorium', 'MCA Lab 1', 'Engineering Block', 'Room 117'],
      source: 'MITM Campus Database'
    };
  }

  // C) Maths & Conversions
  function handleMath(intentData) {
    let expr = intentData.query;

    // Handle percentage expressions: "X% of Y" or "X percent of Y"
    const pctMatch = expr.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:of)\s*(\d+(?:\.\d+)?)/i);
    if (pctMatch) {
      const p = parseFloat(pctMatch[1]);
      const total = parseFloat(pctMatch[2]);
      const res = (p / 100) * total;
      return {
        text: `**${p}% of ${total}** = **${res}**\n\n` +
          `Calculation: (${p} / 100) * ${total} = ${res}`,
        source: 'Math Engine'
      };
    }

    // Handle math.js evaluation
    try {
      let result = null;
      if (window.math && typeof window.math.evaluate === 'function') {
        result = window.math.evaluate(expr);
      } else {
        const cleanExpr = expr.replace(/[^0-9+\-*/().^]/g, '');
        if (cleanExpr) {
          result = Function(`"use strict"; return (${cleanExpr})`)();
        }
      }

      if (result !== null && result !== undefined) {
        return {
          text: `**Expression**: \`${expr}\`\n\n` +
            `**Result**: **${result.toString()}**`,
          source: 'Math Engine (math.js)'
        };
      }
    } catch (err) {
      return {
        text: `Could not evaluate math expression \`${expr}\`. Please check syntax (e.g. \`2+2*5\`, \`sqrt(144)\`, \`10 km to miles\`).`,
        source: 'Math Engine'
      };
    }

    return {
      text: `Please enter a valid math expression, like \`2+2*5\`, \`15% of 800\`, or \`10 km to miles\`.`,
      source: 'Math Engine'
    };
  }

  // D) Time & Date
  function handleTimeDate() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

    return {
      text: `**Current Time & Date**\n\n` +
        `* **Time**: **${timeStr}**\n` +
        `* **Date**: **${dateStr}**\n` +
        `* **Timezone**: ${tz}`,
      source: 'Browser Local Clock'
    };
  }

  // E) Weather (Open-Meteo)
  async function handleWeather(intentData) {
    let cityName = 'Mysore';
    const match = intentData.query.match(/weather\s+(?:in|at|for)?\s*([a-z\s]+)/i);
    if (match && match[1].trim()) {
      cityName = match[1].trim();
    }

    const cacheKey = `weather_${cityName.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`;
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) throw new Error('Geocoding service unavailable');
      const geoData = await geoRes.json();

      if (!geoData.results || !geoData.results.length) {
        return {
          text: `Could not find weather coordinates for city **${cityName}**. Try checking the spelling.`,
          source: 'Open-Meteo'
        };
      }

      const place = geoData.results[0];
      const lat = place.latitude;
      const lon = place.longitude;
      const displayName = `${place.name}, ${place.admin1 || place.country || ''}`;

      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m`;
      const weatherRes = await fetch(forecastUrl);
      if (!weatherRes.ok) throw new Error('Weather forecast unavailable');
      const weatherData = await weatherRes.json();

      const curr = weatherData.current;
      const temp = curr.temperature_2m;
      const code = curr.weather_code;
      const wind = curr.wind_speed_10m;
      const humidity = curr.relative_humidity_2m;
      const condition = WMO_WEATHER_CODES[code] || 'Clear';

      const response = {
        text: `**Weather for ${displayName}**\n\n` +
          `* **Condition**: ${condition}\n` +
          `* **Temperature**: **${temp} °C**\n` +
          `* **Relative Humidity**: ${humidity}%\n` +
          `* **Wind Speed**: ${wind} km/h`,
        source: 'Open-Meteo'
      };

      setCached(cacheKey, response, CACHE_TTL_WEATHER);
      return response;
    } catch (err) {
      return {
        text: `Weather data is currently unavailable. Please check your internet connection. (Error: ${escapeHtml(err.message)})`,
        source: 'Open-Meteo'
      };
    }
  }

  // F) Definitions (Wiktionary REST API)
  async function handleDefinition(intentData) {
    const word = intentData.word.toLowerCase();
    const cacheKey = `def_${word}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
      const res = await fetch(url, { headers: USER_AGENT_HEADER });
      if (!res.ok) {
        return {
          text: `No dictionary definition found on Wiktionary for **${word}**.`,
          source: 'Wiktionary'
        };
      }

      const data = await res.json();
      const enEntries = data.en;
      if (!enEntries || !enEntries.length) {
        return {
          text: `No English definitions found for **${word}**.`,
          source: 'Wiktionary'
        };
      }

      let resultText = `**Definition of ${word}**\n\n`;
      let count = 0;

      for (const entry of enEntries) {
        const partOfSpeech = entry.partOfSpeech || 'General';
        if (entry.definitions && entry.definitions.length) {
          resultText += `* **${partOfSpeech}**:\n`;
          for (let i = 0; i < Math.min(2, entry.definitions.length); i++) {
            const defClean = entry.definitions[i].definition.replace(/<[^>]*>?/gm, '').trim();
            resultText += `  ${i + 1}. ${defClean}\n`;
            count++;
          }
          if (count >= 2) break;
        }
      }

      const response = {
        text: resultText.trim(),
        source: 'Wiktionary'
      };

      setCached(cacheKey, response, CACHE_TTL_DEFAULT);
      return response;
    } catch (err) {
      return {
        text: `Unable to fetch definition for **${word}** at this moment.`,
        source: 'Wiktionary'
      };
    }
  }

  // G) General Knowledge & Comparison (Wikipedia)
  async function fetchWikiSummary(topic) {
    const cacheKey = `wiki_${topic.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      // 1. Search for page
      const searchUrl = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(topic)}&limit=3`;
      const searchRes = await fetch(searchUrl, { headers: USER_AGENT_HEADER });
      if (!searchRes.ok) return null;
      const searchData = await searchRes.json();

      if (!searchData.pages || !searchData.pages.length) return null;

      const topPage = searchData.pages[0];
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topPage.key)}`;
      const summaryRes = await fetch(summaryUrl, { headers: USER_AGENT_HEADER });
      if (!summaryRes.ok) return null;
      const summaryData = await summaryRes.json();

      const otherPages = searchData.pages.slice(1).map(p => p.title);
      const result = {
        title: summaryData.title,
        extract: summaryData.extract,
        thumbnail: summaryData.thumbnail ? summaryData.thumbnail.source : null,
        pageUrl: summaryData.content_urls ? summaryData.content_urls.desktop.page : `https://en.wikipedia.org/wiki/${encodeURIComponent(topPage.key)}`,
        alternatives: otherPages
      };

      setCached(cacheKey, result, CACHE_TTL_DEFAULT);
      return result;
    } catch (e) {
      return null;
    }
  }

  async function handleComparison(intentData) {
    const itemA = intentData.itemA;
    const itemB = intentData.itemB;

    // Check if code snippets already has an exact comparison (e.g. "difference between let and var")
    const snippets = await loadCodeSnippets();
    if (snippets && snippets.length) {
      for (const s of snippets) {
        const titleLower = s.title.toLowerCase();
        if (titleLower.includes('difference') && (titleLower.includes(itemA.toLowerCase()) || titleLower.includes(itemB.toLowerCase()))) {
          const langChips = ['JavaScript', 'Python', 'Java', 'C++'];
          const formattedCode = `\`\`\`${s.language}\n${s.code}\n\`\`\``;
          return {
            text: `**${s.title}**\n\n${s.description || ''}\n\n${formattedCode}`,
            chips: langChips,
            source: 'MITM Local Code Library'
          };
        }
      }
    }

    // Fetch Wikipedia side-by-side comparison
    const [sumA, sumB] = await Promise.all([
      fetchWikiSummary(itemA),
      fetchWikiSummary(itemB)
    ]);

    if (!sumA && !sumB) {
      return {
        text: `Could not find comparison information for **${itemA}** and **${itemB}**.`,
        source: 'Wikipedia'
      };
    }

    let comparisonHtml = `**Comparison: ${itemA.toUpperCase()} vs ${itemB.toUpperCase()}**\n\n`;

    if (sumA) {
      comparisonHtml += `### ${sumA.title}\n${sumA.extract}\n[Read more on Wikipedia](${sumA.pageUrl})\n\n`;
    } else {
      comparisonHtml += `### ${itemA}\nNo encyclopedia summary available.\n\n`;
    }

    if (sumB) {
      comparisonHtml += `### ${sumB.title}\n${sumB.extract}\n[Read more on Wikipedia](${sumB.pageUrl})`;
    } else {
      comparisonHtml += `### ${itemB}\nNo encyclopedia summary available.`;
    }

    return {
      text: comparisonHtml,
      source: 'Wikipedia'
    };
  }

  async function handleGeneralKnowledge(intentData) {
    const topic = intentData.topic;
    const summary = await fetchWikiSummary(topic);

    if (!summary) {
      return {
        text: `No Wikipedia summary found for **${topic}**. You can search directly on the web.`,
        actions: [
          {
            title: `Search Google for "${topic}"`,
            action: `window.open('https://www.google.com/search?q=${encodeURIComponent(topic)}', '_blank')`,
            type: 'secondary'
          }
        ],
        source: 'Wikipedia'
      };
    }

    let text = `**${summary.title}**\n\n${summary.extract}\n\n[Read more on Wikipedia](${summary.pageUrl})`;

    return {
      text: text,
      thumbnail: summary.thumbnail,
      chips: summary.alternatives && summary.alternatives.length ? summary.alternatives.slice(0, 3) : null,
      source: 'Wikipedia'
    };
  }

  // H) Coding Help (Local First)
  async function handleCoding(intentData) {
    const snippets = await loadCodeSnippets();
    const query = intentData.query.toLowerCase();

    // Check for explicit language requested in prompt or saved preference
    const langs = [
      { name: 'python', label: 'Python' },
      { name: 'java', label: 'Java' },
      { name: 'c++', label: 'C++' },
      { name: 'cpp', label: 'C++' },
      { name: 'c', label: 'C' },
      { name: 'sql', label: 'SQL' },
      { name: 'javascript', label: 'JavaScript' },
      { name: 'js', label: 'JavaScript' },
      { name: 'html', label: 'HTML/CSS' },
      { name: 'css', label: 'CSS' }
    ];

    let targetLang = null;
    for (const l of langs) {
      if (new RegExp(`\\b${l.name.replace('+', '\\+')}\\b`, 'i').test(query)) {
        targetLang = l.name === 'cpp' ? 'c++' : (l.name === 'js' ? 'javascript' : l.name);
        activeLanguage = targetLang;
        localStorage.setItem(STORAGE_KEYS.PREFERRED_LANG, targetLang);
        break;
      }
    }

    // 1. Search local snippet library
    if (snippets && snippets.length) {
      let bestMatch = null;
      let highestScore = 0;

      for (const item of snippets) {
        let score = 0;
        const itemTitle = item.title.toLowerCase();
        const itemLang = item.language.toLowerCase();
        const tags = (item.tags || []).map(t => t.toLowerCase());

        // Language matching bonus
        if (targetLang) {
          const isLangMatch = (itemLang === targetLang) ||
            (targetLang === 'c++' && itemLang === 'cpp') ||
            (targetLang === 'javascript' && itemLang === 'js');

          if (isLangMatch) {
            score += 25.0; // Strong bonus for matching requested language!
          } else {
            score -= 10.0; // Penalty if user requested a different language
          }
        }

        // Title match
        if (query.includes(itemTitle) || itemTitle.includes(query)) {
          score += 10.0;
        } else {
          score += tokenOverlap(query, itemTitle) * 6.0;
        }

        // Tags match
        for (const tag of tags) {
          if (query.includes(tag)) {
            score += 3.0;
          }
        }

        if (score > highestScore && score > 3.0) {
          highestScore = score;
          bestMatch = item;
        }
      }

      if (bestMatch) {
        const langChips = ['Python', 'Java', 'C', 'C++', 'SQL', 'JavaScript'];
        const formattedCode = `\`\`\`${bestMatch.language}\n${bestMatch.code}\n\`\`\``;
        return {
          text: `**${bestMatch.title}** (${bestMatch.language.toUpperCase()})\n\n` +
            `${bestMatch.description || ''}\n\n` +
            `${formattedCode}`,
          chips: langChips.map(l => `${bestMatch.title.replace(/\s+in\s+[a-zA-Z+]+/i, '')} in ${l}`),
          source: 'MITM Local Code Library'
        };
      }
    }

    // 2. MDN search API for web concepts (JavaScript, CSS, HTML, Web APIs)
    if (/\b(javascript|js|css|html|dom|fetch|promise|async|event|storage|canvas|api)\b/i.test(query)) {
      try {
        const mdnUrl = `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&locale=en-US`;
        const mdnRes = await fetch(mdnUrl);
        if (mdnRes.ok) {
          const mdnData = await mdnRes.json();
          if (mdnData.documents && mdnData.documents.length) {
            const doc = mdnData.documents[0];
            const mdnLink = `https://developer.mozilla.org${doc.mdn_url}`;
            return {
              text: `**${doc.title}**\n\n` +
                `${doc.summary}\n\n` +
                `[Read full documentation on MDN Web Docs](${mdnLink})`,
              source: 'MDN Web Docs'
            };
          }
        }
      } catch (e) {
        // MDN search failed silently
      }
    }

    // 3. Fallback: Check if it's a CS concept question and fetch Wikipedia
    const conceptTerms = ['polymorphism', 'deadlock', 'recursion', 'inheritance', 'encapsulation', 'thread', 'semaphore', 'process', 'compiler', 'cache'];
    const isConcept = conceptTerms.some(t => query.includes(t));
    if (isConcept) {
      return await handleGeneralKnowledge({ topic: query });
    }

    // 4. Try optional cheat.sh proxy if running on Vercel
    try {
      const cheatLang = targetLang || activeLanguage;
      const cheatUrl = `/api/cheat?q=${encodeURIComponent(cheatLang + '/' + query)}`;
      const cheatRes = await fetch(cheatUrl);
      if (cheatRes.ok) {
        const cheatData = await cheatRes.json();
        if (cheatData.code && !cheatData.fallback) {
          return {
            text: `**Syntax Example (${cheatLang.toUpperCase()})**\n\n` +
              `\`\`\`${cheatLang}\n${cheatData.code.slice(0, 800)}\n\`\`\``,
            source: 'cheat.sh'
          };
        }
      }
    } catch (e) {
      // Cheat.sh unavailable, proceed to fallback
    }

    // Coding fallback
    return {
      text: `I could not find an exact snippet for "${intentData.query}". Try specifying a language like "fibonacci in python", "reverse a string in java", or "sql inner join".`,
      chips: ['Fibonacci in Python', 'Reverse a String in Java', 'SQL inner join example', 'Binary search in C++'],
      source: 'MITM Code Library'
    };
  }

  // I) Last Fallback
  function handleFallback(intentData) {
    const q = intentData.query || '';
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;

    return {
      text: `I couldn't find an exact answer for that. Try rephrasing, or search the web directly.`,
      actions: [
        {
          title: 'Search on Google',
          action: `window.open('${googleUrl}', '_blank', 'noopener,noreferrer')`,
          type: 'primary'
        }
      ],
      chips: [
        'Where is MCA Lab 1',
        'Belaku auditorium',
        'Weather in Mysore'
      ],
      source: 'Navigo Search'
    };
  }

  // Central Router Dispatcher
  async function routeMessage(rawText) {
    const norm = normalizeText(rawText);
    if (!norm) {
      return {
        text: 'Please type a question or select one of the suggested topics below.',
        chips: ['Where is MCA Lab 1', 'Belaku auditorium', 'Weather in Mysore', 'Fibonacci in Python'],
        source: 'Navigo'
      };
    }

    const intentData = classifyIntent(norm, rawText);

    switch (intentData.intent) {
      case 'greeting':
        return handleGreeting(intentData);
      case 'campus':
        return await handleCampus(intentData);
      case 'math':
        return handleMath(intentData);
      case 'time_date':
        return handleTimeDate(intentData);
      case 'weather':
        return await handleWeather(intentData);
      case 'definition':
        return await handleDefinition(intentData);
      case 'comparison':
        return await handleComparison(intentData);
      case 'general_knowledge':
        return await handleGeneralKnowledge(intentData);
      case 'coding':
        return await handleCoding(intentData);
      case 'fallback':
      default:
        return handleFallback(intentData);
    }
  }

  // STEP 3: Chatbox UI Controller & DOM Binding
  class ChatUI {
    constructor() {
      this.history = this.loadHistory();
      this.isOpen = false;
      this.initDOMElements();
      this.bindEvents();
      this.renderHistory();

      // Pre-load data in background
      loadCampusData();
      loadCodeSnippets();
    }

    loadHistory() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    saveHistory() {
      try {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(this.history.slice(-50)));
      } catch (e) {
        // quota exceeded
      }
    }

    initDOMElements() {
      if (document.getElementById('navigo-chat-root')) return;

      const container = document.createElement('div');
      container.id = 'navigo-chat-root';
      container.innerHTML = `
        <!-- Floating FAB Button -->
        <button id="navigo-fab-btn" class="navigo-fab-btn" aria-label="Open Ask Navigo Chatbot">
          <svg class="navigo-fab-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span class="navigo-fab-label">Ask Navigo</span>
        </button>

        <!-- Chat Modal / Bottom Sheet -->
        <div id="navigo-chat-window" class="navigo-chat-window" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="navigo-chat-title">
          <!-- Chat Header -->
          <div class="navigo-chat-header">
            <div class="navigo-chat-header-title">
              <div class="navigo-chat-avatar">N</div>
              <div>
                <h3 id="navigo-chat-title" class="navigo-chat-name">Ask Navigo</h3>
                <span class="navigo-chat-subtitle">MITM Campus & Student Assistant</span>
              </div>
            </div>
            <div class="navigo-chat-header-actions">
              <button id="navigo-new-chat-btn" class="navigo-icon-btn" title="New Chat" aria-label="Start new chat">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
              </button>
              <button id="navigo-close-btn" class="navigo-icon-btn" title="Close chat" aria-label="Close chat window">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Message Stream -->
          <div id="navigo-messages" class="navigo-messages-container" role="log" aria-live="polite"></div>

          <!-- Typing Indicator Bubble -->
          <div id="navigo-typing" class="navigo-typing-row" style="display: none;">
            <div class="navigo-typing-bubble">
              <span class="navigo-dot"></span>
              <span class="navigo-dot"></span>
              <span class="navigo-dot"></span>
            </div>
          </div>

          <!-- Quick Suggestion Chips Container -->
          <div id="navigo-chips" class="navigo-chips-container"></div>

          <!-- Input Footer -->
          <div class="navigo-chat-footer">
            <form id="navigo-chat-form" class="navigo-chat-form" onsubmit="return false;">
              <input
                id="navigo-input"
                class="navigo-chat-input"
                type="text"
                placeholder="Ask about MITM rooms, coding, math..."
                autocomplete="off"
                aria-label="Ask a question"
              />
              <button id="navigo-send-btn" class="navigo-send-btn" type="submit" aria-label="Send message">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </form>
          </div>
        </div>
      `;

      document.body.appendChild(container);
    }

    bindEvents() {
      const fabBtn = document.getElementById('navigo-fab-btn');
      const closeBtn = document.getElementById('navigo-close-btn');
      const newChatBtn = document.getElementById('navigo-new-chat-btn');
      const chatForm = document.getElementById('navigo-chat-form');

      if (fabBtn) {
        fabBtn.addEventListener('click', () => this.toggleWindow());
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeWindow());
      }

      if (newChatBtn) {
        newChatBtn.addEventListener('click', () => this.clearHistory());
      }

      if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleUserSubmit();
        });
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.closeWindow();
        }
      });
    }

    toggleWindow() {
      if (this.isOpen) {
        this.closeWindow();
      } else {
        this.openWindow();
      }
    }

    openWindow() {
      const chatWindow = document.getElementById('navigo-chat-window');
      if (chatWindow) {
        chatWindow.style.display = 'flex';
        this.isOpen = true;
        this.scrollToBottom();
        const input = document.getElementById('navigo-input');
        if (input) setTimeout(() => input.focus(), 150);
      }
    }

    closeWindow() {
      const chatWindow = document.getElementById('navigo-chat-window');
      if (chatWindow) {
        chatWindow.style.display = 'none';
        this.isOpen = false;
      }
    }

    clearHistory() {
      this.history = [];
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
      const messagesContainer = document.getElementById('navigo-messages');
      if (messagesContainer) messagesContainer.innerHTML = '';
      this.renderWelcome();
    }

    renderWelcome() {
      this.appendBotMessage({
        text: 'Hello! I am **Navigo**, your instant assistant for Maharaja Institute of Technology Mysore (MITM).\n\n' +
          'Ask me where any classroom or lab is, get code snippets, weather, math calculations, or definitions.',
        chips: ['Where is MCA Lab 1', 'Belaku auditorium', 'Weather in Mysore', 'Fibonacci in Python', '15% of 800'],
        source: 'Navigo Local'
      }, false);
    }

    renderHistory() {
      const messagesContainer = document.getElementById('navigo-messages');
      if (!messagesContainer) return;
      messagesContainer.innerHTML = '';

      if (!this.history || !this.history.length) {
        this.renderWelcome();
        return;
      }

      for (const item of this.history) {
        if (item.sender === 'user') {
          this.renderUserMessageDOM(item.text, item.time);
        } else {
          this.renderBotMessageDOM(item, item.time, false);
        }
      }
      this.scrollToBottom();
    }

    renderUserMessageDOM(text, timeStr) {
      const container = document.getElementById('navigo-messages');
      if (!container) return;

      const row = document.createElement('div');
      row.className = 'navigo-msg-row navigo-msg-user';
      row.innerHTML = `
        <div class="navigo-msg-bubble navigo-user-bubble">
          <div class="navigo-msg-content">${escapeHtml(text)}</div>
          <div class="navigo-msg-time">${timeStr || this.getCurrentTimeStr()}</div>
        </div>
      `;
      container.appendChild(row);
      this.scrollToBottom();
    }

    renderBotMessageDOM(msgData, timeStr, recordHistory = true) {
      const container = document.getElementById('navigo-messages');
      if (!container) return;

      const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const row = document.createElement('div');
      row.className = 'navigo-msg-row navigo-msg-bot';

      let actionsHtml = '';
      if (msgData.actions && msgData.actions.length) {
        actionsHtml = `<div class="navigo-msg-actions">` +
          msgData.actions.map(act =>
            `<button class="navigo-pill-btn ${act.type === 'primary' ? 'navigo-pill-primary' : 'navigo-pill-secondary'}" onclick="${escapeHtml(act.action)}">${escapeHtml(act.title)}</button>`
          ).join('') +
          `</div>`;
      }

      let sourceHtml = '';
      if (msgData.source) {
        sourceHtml = `<span class="navigo-msg-source">Source: ${escapeHtml(msgData.source)}</span>`;
      }

      let thumbHtml = '';
      if (msgData.thumbnail) {
        thumbHtml = `<div class="navigo-msg-thumb"><img src="${escapeHtml(msgData.thumbnail)}" alt="Thumbnail" loading="lazy" /></div>`;
      }

      row.innerHTML = `
        <div class="navigo-bot-avatar">N</div>
        <div class="navigo-msg-bubble navigo-bot-bubble" id="${msgId}">
          ${thumbHtml}
          <div class="navigo-msg-content">${renderMarkdownLite(msgData.text)}</div>
          ${actionsHtml}
          <div class="navigo-msg-footer">
            ${sourceHtml}
            <div class="navigo-feedback-btns">
              <button class="navigo-feedback-btn" onclick="window.NavigoChatbot.sendFeedback('${msgId}', 'up', this)" title="Helpful" aria-label="Thumbs up">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                </svg>
              </button>
              <button class="navigo-feedback-btn" onclick="window.NavigoChatbot.sendFeedback('${msgId}', 'down', this)" title="Not helpful" aria-label="Thumbs down">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h3a2 2 0 012 2v7a2 2 0 01-2 2h-3"/>
                </svg>
              </button>
            </div>
            <span class="navigo-msg-time">${timeStr || this.getCurrentTimeStr()}</span>
          </div>
        </div>
      `;

      container.appendChild(row);
      this.renderChips(msgData.chips);
      this.scrollToBottom();

      if (recordHistory) {
        this.history.push({
          sender: 'bot',
          text: msgData.text,
          actions: msgData.actions || null,
          source: msgData.source || null,
          chips: msgData.chips || null,
          time: timeStr || this.getCurrentTimeStr()
        });
        this.saveHistory();
      }
    }

    renderChips(chips) {
      const container = document.getElementById('navigo-chips');
      if (!container) return;
      container.innerHTML = '';
      if (!chips || !chips.length) return;

      for (const chip of chips) {
        const btn = document.createElement('button');
        btn.className = 'navigo-chip-btn';
        btn.textContent = chip;
        btn.addEventListener('click', () => {
          this.submitQuery(chip);
        });
        container.appendChild(btn);
      }
    }

    appendUserMessage(text) {
      const timeStr = this.getCurrentTimeStr();
      this.renderUserMessageDOM(text, timeStr);
      this.history.push({
        sender: 'user',
        text: text,
        time: timeStr
      });
      this.saveHistory();
    }

    appendBotMessage(msgData, recordHistory = true) {
      const timeStr = this.getCurrentTimeStr();
      this.renderBotMessageDOM(msgData, timeStr, recordHistory);
    }

    setTyping(isTyping) {
      const typingEl = document.getElementById('navigo-typing');
      if (typingEl) {
        typingEl.style.display = isTyping ? 'flex' : 'none';
        if (isTyping) this.scrollToBottom();
      }
    }

    scrollToBottom() {
      const container = document.getElementById('navigo-messages');
      if (container) {
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 50);
      }
    }

    getCurrentTimeStr() {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    async submitQuery(text) {
      if (!text || !text.trim() || isAwaitingResponse) return;
      const cleanText = text.trim();
      this.appendUserMessage(cleanText);

      const input = document.getElementById('navigo-input');
      if (input) input.value = '';

      this.renderChips([]);

      isAwaitingResponse = true;
      this.setTyping(true);

      await new Promise(r => setTimeout(r, 150));

      try {
        const result = await routeMessage(cleanText);
        this.setTyping(false);
        this.appendBotMessage(result, true);
      } catch (err) {
        this.setTyping(false);
        this.appendBotMessage({
          text: 'An error occurred while answering your question. Please try again.',
          source: 'System Error'
        }, true);
      } finally {
        isAwaitingResponse = false;
      }
    }

    handleUserSubmit() {
      const input = document.getElementById('navigo-input');
      if (input && input.value.trim()) {
        this.submitQuery(input.value);
      }
    }
  }

  // Global Navigation helpers called from action buttons
  window.navigateUrl = function (url) {
    if (!url) return;
    if (url.startsWith('#room=')) {
      const roomKey = url.replace('#room=', '');
      if (typeof window.openRoom === 'function') {
        window.openRoom(roomKey);
      } else {
        window.location.hash = url;
      }
    } else if (url.startsWith('#college=')) {
      const collegeKey = url.replace('#college=', '');
      if (typeof window.enterCollege === 'function') {
        window.enterCollege(collegeKey);
      } else {
        window.location.hash = url;
      }
    } else if (url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  // Feedback handler
  function sendFeedback(msgId, rating, btnEl) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
      const list = raw ? JSON.parse(raw) : [];
      list.push({
        id: msgId,
        rating: rating,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(list));

      if (btnEl && btnEl.parentElement) {
        const btns = btnEl.parentElement.querySelectorAll('.navigo-feedback-btn');
        btns.forEach(b => b.classList.remove('navigo-feedback-active'));
        btnEl.classList.add('navigo-feedback-active');
      }
    } catch (e) {
      // ignore
    }
  }

  // Copy code handler
  function copyCode(btnEl) {
    if (!btnEl) return;
    const pre = btnEl.closest('.navigo-code-wrapper')?.querySelector('pre');
    if (!pre) return;
    const text = pre.innerText;
    navigator.clipboard.writeText(text).then(() => {
      const orig = btnEl.innerText;
      btnEl.innerText = 'Copied!';
      setTimeout(() => {
        btnEl.innerText = orig;
      }, 2000);
    }).catch(() => {
      btnEl.innerText = 'Failed';
    });
  }

  // Inject Chatbot styles
  function injectStyles() {
    if (document.getElementById('navigo-chat-styles')) return;
    const style = document.createElement('style');
    style.id = 'navigo-chat-styles';
    style.textContent = `
      /* MITM Navigo Chatbot UI Styles - Blue #0B57D0, pill shapes, floating window & bottom sheet */
      :root {
        --navigo-primary: #0B57D0;
        --navigo-primary-hover: #0842a0;
        --navigo-surface: #ffffff;
        --navigo-bg: #f8fafd;
        --navigo-text: #1f1f1f;
        --navigo-muted: #5e5e5e;
        --navigo-border: #e0e2ec;
        --navigo-bubble-user: #0B57D0;
        --navigo-bubble-bot: #f0f4f9;
        --navigo-shadow: 0 8px 24px rgba(11, 87, 208, 0.15), 0 2px 6px rgba(0,0,0,0.08);
      }

      /* Floating Action Button */
      .navigo-fab-btn {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 8px;
        background-color: var(--navigo-primary);
        color: #ffffff;
        border: none;
        padding: 12px 20px;
        border-radius: 9999px;
        box-shadow: 0 4px 16px rgba(11, 87, 208, 0.35);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s;
      }
      .navigo-fab-btn:hover {
        background-color: var(--navigo-primary-hover);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(11, 87, 208, 0.45);
      }
      .navigo-fab-btn:active {
        transform: scale(0.96);
      }

      /* Chat Window - Desktop Floating Window */
      .navigo-chat-window {
        position: fixed;
        bottom: 84px;
        right: 24px;
        width: 380px;
        height: 600px;
        max-height: calc(100vh - 110px);
        background: var(--navigo-surface);
        border-radius: 20px;
        box-shadow: var(--navigo-shadow);
        border: 1px solid var(--navigo-border);
        display: flex;
        flex-direction: column;
        z-index: 99999;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: var(--navigo-text);
        animation: navigoSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes navigoSlideUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Mobile Bottom Sheet (<768px) */
      @media (max-width: 768px) {
        .navigo-fab-btn {
          bottom: 16px;
          right: 16px;
          padding: 10px 16px;
        }
        .navigo-chat-window {
          bottom: 0;
          right: 0;
          left: 0;
          width: 100%;
          height: 85vh;
          max-height: 85vh;
          border-radius: 24px 24px 0 0;
          border-bottom: none;
          animation: navigoBottomSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      }

      @keyframes navigoBottomSheet {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }

      /* Header */
      .navigo-chat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        background: #ffffff;
        border-bottom: 1px solid var(--navigo-border);
      }
      .navigo-chat-header-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .navigo-chat-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0B57D0, #1A73E8);
        color: #ffffff;
        font-weight: 700;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .navigo-chat-name {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: var(--navigo-text);
      }
      .navigo-chat-subtitle {
        font-size: 11px;
        color: var(--navigo-muted);
        display: block;
      }
      .navigo-chat-header-actions {
        display: flex;
        gap: 4px;
      }
      .navigo-icon-btn {
        background: transparent;
        border: none;
        color: var(--navigo-muted);
        padding: 6px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.15s;
      }
      .navigo-icon-btn:hover {
        background-color: var(--navigo-bg);
        color: var(--navigo-text);
      }

      /* Message Stream */
      .navigo-messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        background-color: var(--navigo-bg);
        scroll-behavior: smooth;
      }

      .navigo-msg-row {
        display: flex;
        gap: 8px;
        max-width: 85%;
      }
      .navigo-msg-user {
        align-self: flex-end;
        flex-direction: row-reverse;
      }
      .navigo-msg-bot {
        align-self: flex-start;
      }
      .navigo-bot-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #0B57D0;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 4px;
      }

      .navigo-msg-bubble {
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 13.5px;
        line-height: 1.5;
        word-break: break-word;
      }
      .navigo-user-bubble {
        background-color: var(--navigo-bubble-user);
        color: #ffffff;
        border-bottom-right-radius: 4px;
      }
      .navigo-user-bubble .navigo-msg-time {
        color: rgba(255, 255, 255, 0.7);
        text-align: right;
      }
      .navigo-bot-bubble {
        background-color: var(--navigo-bubble-bot);
        color: var(--navigo-text);
        border-bottom-left-radius: 4px;
        border: 1px solid #e3e8ee;
      }

      .navigo-msg-content p {
        margin: 0 0 8px 0;
      }
      .navigo-msg-content p:last-child {
        margin-bottom: 0;
      }
      .navigo-chat-ul {
        margin: 6px 0;
        padding-left: 18px;
      }
      .navigo-chat-li {
        margin-bottom: 4px;
      }
      .navigo-msg-content a {
        color: #0B57D0;
        text-decoration: underline;
        font-weight: 500;
      }
      .navigo-msg-thumb img {
        max-width: 100%;
        border-radius: 8px;
        margin-bottom: 8px;
      }

      /* Code Blocks */
      .navigo-code-wrapper {
        margin: 8px 0;
        background: #1e1e1e;
        border-radius: 10px;
        overflow: hidden;
      }
      .navigo-code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #2d2d2d;
        padding: 4px 10px;
        font-size: 11px;
        color: #cccccc;
      }
      .navigo-copy-btn {
        background: transparent;
        border: 1px solid #555;
        color: #eee;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 10.5px;
        cursor: pointer;
      }
      .navigo-copy-btn:hover {
        background: #444;
      }
      .navigo-code-wrapper pre {
        margin: 0;
        padding: 10px 12px;
        overflow-x: auto;
        font-family: Consolas, Monaco, "Courier New", monospace;
        font-size: 12px;
        color: #f8f8f2;
      }

      /* Actions & Pills */
      .navigo-msg-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 10px;
      }
      .navigo-pill-btn {
        padding: 6px 14px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: transform 0.15s, background-color 0.15s;
      }
      .navigo-pill-primary {
        background-color: var(--navigo-primary);
        color: #ffffff;
      }
      .navigo-pill-primary:hover {
        background-color: var(--navigo-primary-hover);
        transform: scale(1.02);
      }
      .navigo-pill-secondary {
        background-color: #e8f0fe;
        color: #0B57D0;
      }
      .navigo-pill-secondary:hover {
        background-color: #d2e3fc;
      }

      /* Message Footer & Feedback */
      .navigo-msg-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 6px;
        font-size: 10.5px;
        color: var(--navigo-muted);
        gap: 8px;
      }
      .navigo-feedback-btns {
        display: flex;
        gap: 2px;
      }
      .navigo-feedback-btn {
        background: transparent;
        border: none;
        color: #888;
        padding: 2px 4px;
        border-radius: 4px;
        cursor: pointer;
      }
      .navigo-feedback-btn:hover {
        color: #333;
      }
      .navigo-feedback-active {
        color: #0B57D0 !important;
      }
      .navigo-msg-time {
        font-size: 10px;
        color: var(--navigo-muted);
      }

      /* Suggestion Chips */
      .navigo-chips-container {
        display: flex;
        overflow-x: auto;
        gap: 6px;
        padding: 8px 14px;
        background: #ffffff;
        border-top: 1px solid var(--navigo-border);
        scrollbar-width: none;
      }
      .navigo-chips-container::-webkit-scrollbar {
        display: none;
      }
      .navigo-chip-btn {
        flex-shrink: 0;
        background: #f0f4f9;
        border: 1px solid #d3e3fd;
        color: #0B57D0;
        padding: 5px 12px;
        border-radius: 9999px;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 0.15s;
      }
      .navigo-chip-btn:hover {
        background: #d3e3fd;
      }

      /* Typing Bubble */
      .navigo-typing-row {
        padding: 0 16px 8px 16px;
        background-color: var(--navigo-bg);
      }
      .navigo-typing-bubble {
        background: var(--navigo-bubble-bot);
        padding: 8px 14px;
        border-radius: 16px;
        display: inline-flex;
        gap: 4px;
        align-items: center;
      }
      .navigo-dot {
        width: 6px;
        height: 6px;
        background: #888;
        border-radius: 50%;
        animation: navigoBounce 1.2s infinite ease-in-out;
      }
      .navigo-dot:nth-child(2) { animation-delay: 0.2s; }
      .navigo-dot:nth-child(3) { animation-delay: 0.4s; }

      @keyframes navigoBounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }

      /* Footer Form */
      .navigo-chat-footer {
        padding: 10px 14px;
        background: #ffffff;
        border-top: 1px solid var(--navigo-border);
      }
      .navigo-chat-form {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .navigo-chat-input {
        flex: 1;
        padding: 10px 16px;
        border: 1px solid var(--navigo-border);
        border-radius: 9999px;
        font-size: 13.5px;
        outline: none;
        transition: border-color 0.2s;
        background: #ffffff;
      }
      .navigo-chat-input:focus {
        border-color: var(--navigo-primary);
        box-shadow: 0 0 0 2px rgba(11, 87, 208, 0.15);
      }
      .navigo-send-btn {
        background: var(--navigo-primary);
        color: #ffffff;
        border: none;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: background-color 0.15s, transform 0.15s;
      }
      .navigo-send-btn:hover {
        background: var(--navigo-primary-hover);
        transform: scale(1.05);
      }
      .navigo-send-btn:active {
        transform: scale(0.95);
      }
    `;
    document.head.appendChild(style);
  }

  // Export to window
  window.NavigoChatbot = {
    init: function () {
      injectStyles();
      if (!window.navigoChatInstance) {
        window.navigoChatInstance = new ChatUI();
      }
      return window.navigoChatInstance;
    },
    routeMessage: routeMessage,
    classifyIntent: classifyIntent,
    sendFeedback: sendFeedback,
    copyCode: copyCode
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.NavigoChatbot.init());
  } else {
    window.NavigoChatbot.init();
  }

})(typeof window !== 'undefined' ? window : this, typeof document !== 'undefined' ? document : {});
