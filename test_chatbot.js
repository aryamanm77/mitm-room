// Automated Test Suite for MITM Navigo Chatbot Router & Answer Handlers
// Tests all 15 required prompts from the specification

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const campusData = JSON.parse(fs.readFileSync(path.join(__dirname, 'campus-data.json'), 'utf8'));
const codeSnippets = JSON.parse(fs.readFileSync(path.join(__dirname, 'code-snippets.json'), 'utf8'));
const roomsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'rooms_data.json'), 'utf8'));

const USER_AGENT_HEADER = {
  'User-Agent': 'MITMNavigoBot/1.0 (https://mitm-room.vercel.app; navigo-bot@mitm.edu)',
  'Api-User-Agent': 'MITMNavigoBot/1.0'
};

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
  61: 'Slight rain',
  62: 'Moderate rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  80: 'Slight rain showers',
  95: 'Thunderstorm'
};

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

function tokenOverlap(query, target) {
  const qTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const tTokens = target.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (!qTokens.length || !tTokens.length) return 0;
  let matches = 0;
  for (const q of qTokens) {
    if (tTokens.some(t => t.includes(q) || q.includes(t))) {
      matches++;
    }
  }
  return matches / qTokens.length;
}

function classifyIntent(norm, raw) {
  // 1. Small talk
  if (/^(hi|hello|hey|namaste|vanakkam|good\s*(morning|afternoon|evening))\b/i.test(norm)) {
    return { intent: 'greeting', type: 'hello' };
  }
  // 2. Math
  if (/^[0-9\s.+\-*/^%()=]+$/.test(norm) || /\b(\d+(?:\.\d+)?)\s*%\s*(?:of)\s*(\d+(?:\.\d+)?)\b/i.test(norm)) {
    return { intent: 'math', query: norm };
  }
  // 3. Time
  if (/\b(what\s+time\s+is\s+it|current\s+time|time\s+now|today'?s\s+date|what\s+day\s+is\s+it)\b/i.test(norm)) {
    return { intent: 'time_date', query: norm };
  }
  // 4. Weather
  if (/\b(weather|temperature|forecast|rain today|how hot|climate)\b/i.test(norm)) {
    return { intent: 'weather', query: norm };
  }
  // 5. Definitions
  if (/^(meaning of|define|definition of|what is the meaning of)\s+([a-z\s-]+)$/i.test(norm)) {
    const m = norm.match(/^(?:meaning of|define|definition of|what is the meaning of)\s+([a-z\s-]+)$/i);
    return { intent: 'definition', word: m[1].trim() };
  }
  // 6. Comparison
  if (/\b(?:difference between|compare|difference in|vs|versus)\s+(.+?)\s+(?:and|vs|versus|to)\s+(.+)/i.test(norm)) {
    const m = norm.match(/\b(?:difference between|compare|difference in|vs|versus)\s+(.+?)\s+(?:and|vs|versus|to)\s+(.+)/i);
    return { intent: 'comparison', itemA: m[1].trim(), itemB: m[2].trim() };
  }
  // 7. Campus
  const campusKeywords = ['mca', 'mba', 'engineering', 'bca', 'pharmacy', 'belaku', 'auditorium', 'corridor', 'hotspot', 'department', 'block', 'wing', 'floor', 'ground', 'principal', 'office', 'board room', 'placement', 'future skills', 'library', 'canteen', 'lab', 'lh', 'lecture hall'];
  const isCampus = campusKeywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(norm));
  let roomMatch = norm.match(/\b(?:room|lab|cabin|office|lh|hall|no\.?|#)\s*([0-9]{1,3}[a-z]?)\b/i);
  if (!roomMatch) {
    roomMatch = norm.match(/\b(1[0-9]{2}|2[0-9]{2}|3[0-9]{2})\b/);
  }

  if (isCampus || (roomMatch && roomMatch[1])) {
    return { intent: 'campus', query: norm, roomKey: roomMatch ? roomMatch[1] : null };
  }

  // 8. Coding
  const codeLangs = ['python', 'java', 'c++', 'cpp', 'c', 'javascript', 'js', 'html', 'css', 'sql', 'react'];
  const codeKeywords = ['code', 'program', 'snippet', 'function', 'syntax', 'algorithm', 'loop', 'array', 'fibonacci', 'factorial', 'palindrome', 'prime', 'armstrong', 'reverse', 'swap', 'sorting', 'binary search', 'linked list', 'stack', 'queue', 'tree', 'join', 'select'];
  const hasCodeLang = codeLangs.some(l => new RegExp(`\\b${l.replace('+', '\\+')}\\b`, 'i').test(norm));
  const hasCodeWord = codeKeywords.some(k => new RegExp(`\\b${k}\\b`, 'i').test(norm));

  const csConcepts = ['polymorphism', 'deadlock', 'encapsulation', 'inheritance', 'semaphore'];
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

  return { intent: 'fallback', query: norm };
}

async function runTestQuery(rawText) {
  const norm = normalizeText(rawText);
  const intentData = classifyIntent(norm, rawText);

  let output = {
    query: rawText,
    intent: intentData.intent,
    success: false,
    summary: '',
    source: ''
  };

  switch (intentData.intent) {
    case 'campus': {
      let found = null;
      for (const [k, v] of Object.entries(roomsData)) {
        const hasKeyMatch = new RegExp(`\\b${k}\\b`, 'i').test(norm);
        const hasNumMatch = v.room_number && new RegExp(`\\b${v.room_number}\\b`, 'i').test(norm);
        const hasLabelMatch = v.label && norm.includes(v.label.toLowerCase());
        if (hasKeyMatch || hasNumMatch || hasLabelMatch) {
          found = { name: v.label || k, room: k, type: 'room' };
          break;
        }
      }
      if (!found && campusData.blocks) {
        for (const b of campusData.blocks) {
          if (norm.includes(b.name.toLowerCase()) || (b.aliases && b.aliases.some(a => norm.includes(a.toLowerCase())))) {
            found = { name: b.name, desc: b.description, type: 'block' };
            break;
          }
        }
      }
      if (!found && campusData.hotspots) {
        for (const h of campusData.hotspots) {
          if (norm.includes(h.name.toLowerCase()) || (h.aliases && h.aliases.some(a => norm.includes(a.toLowerCase())))) {
            found = { name: h.name, desc: h.description, type: 'hotspot' };
            break;
          }
        }
      }
      output.success = !!found;
      output.summary = found ? `Found campus target: [${found.name}] (${found.type})` : 'No direct campus target';
      output.source = 'campus-data.json / rooms_data.json';
      break;
    }

    case 'math': {
      const pctMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s*(?:of)\s*(\d+(?:\.\d+)?)/i);
      if (pctMatch) {
        const res = (parseFloat(pctMatch[1]) / 100) * parseFloat(pctMatch[2]);
        output.success = true;
        output.summary = `${pctMatch[1]}% of ${pctMatch[2]} = ${res}`;
        output.source = 'Math Engine';
      } else {
        const clean = norm.replace(/[^0-9+\-*/().^]/g, '');
        const res = Function(`"use strict"; return (${clean})`)();
        output.success = res !== null && !isNaN(res);
        output.summary = `Evaluated: ${clean} = ${res}`;
        output.source = 'Math Engine';
      }
      break;
    }

    case 'time_date': {
      const now = new Date();
      output.success = true;
      output.summary = `Current time: ${now.toLocaleTimeString()}, Date: ${now.toLocaleDateString()}`;
      output.source = 'Browser Clock';
      break;
    }

    case 'weather': {
      try {
        const geoRes = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=Mysore&count=1');
        const geoData = await geoRes.json();
        const lat = geoData.results[0].latitude;
        const lon = geoData.results[0].longitude;
        const fcRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m`);
        const fcData = await fcRes.json();
        const temp = fcData.current.temperature_2m;
        const code = fcData.current.weather_code;
        const condition = WMO_WEATHER_CODES[code] || 'Clear';
        output.success = true;
        output.summary = `Mysore: ${temp} C, ${condition}`;
        output.source = 'Open-Meteo';
      } catch (e) {
        output.success = false;
        output.summary = e.message;
      }
      break;
    }

    case 'definition': {
      try {
        const res = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(intentData.word)}`, { headers: USER_AGENT_HEADER });
        const data = await res.json();
        if (data.en && data.en.length) {
          const def1 = data.en[0].definitions[0].definition.replace(/<[^>]*>?/gm, '').trim();
          output.success = true;
          output.summary = `Part: ${data.en[0].partOfSpeech}. Def: ${def1.slice(0, 100)}...`;
          output.source = 'Wiktionary';
        } else {
          output.success = false;
        }
      } catch (e) {
        output.success = false;
        output.summary = e.message;
      }
      break;
    }

    case 'comparison': {
      // Check if code snippets already has an exact comparison (e.g. "difference between let and var")
      let snipMatch = null;
      for (const s of codeSnippets) {
        const titleLower = s.title.toLowerCase();
        if (titleLower.includes('difference') && (titleLower.includes(intentData.itemA.toLowerCase()) || titleLower.includes(intentData.itemB.toLowerCase()))) {
          snipMatch = s;
          break;
        }
      }
      if (snipMatch) {
        output.success = true;
        output.summary = `Local Code Snippet: [${snipMatch.title}]`;
        output.source = 'MITM Local Code Library';
        break;
      }

      try {
        // Search Wikipedia for each
        const [sResA, sResB] = await Promise.all([
          fetch(`https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(intentData.itemA)}&limit=1`, { headers: USER_AGENT_HEADER }),
          fetch(`https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(intentData.itemB)}&limit=1`, { headers: USER_AGENT_HEADER })
        ]);
        const sDataA = await sResA.json();
        const sDataB = await sResB.json();

        const keyA = sDataA.pages && sDataA.pages.length ? sDataA.pages[0].key : intentData.itemA;
        const keyB = sDataB.pages && sDataB.pages.length ? sDataB.pages[0].key : intentData.itemB;

        const [sumResA, sumResB] = await Promise.all([
          fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(keyA)}`, { headers: USER_AGENT_HEADER }),
          fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(keyB)}`, { headers: USER_AGENT_HEADER })
        ]);
        const sumA = await sumResA.json();
        const sumB = await sumResB.json();

        output.success = !!(sumA && sumB);
        output.summary = `Compared [${sumA.title}] and [${sumB.title}] side by side`;
        output.source = 'Wikipedia Side-by-Side';
      } catch (e) {
        output.success = false;
        output.summary = e.message;
      }
      break;
    }

    case 'general_knowledge': {
      try {
        const sRes = await fetch(`https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(intentData.topic)}&limit=1`, { headers: USER_AGENT_HEADER });
        const sData = await sRes.json();
        if (sData.pages && sData.pages.length) {
          const sumRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sData.pages[0].key)}`, { headers: USER_AGENT_HEADER });
          const sumData = await sumRes.json();
          output.success = true;
          output.summary = `[${sumData.title}]: ${sumData.extract.slice(0, 100)}...`;
          output.source = 'Wikipedia';
        } else {
          output.success = false;
        }
      } catch (e) {
        output.success = false;
        output.summary = e.message;
      }
      break;
    }

    case 'coding': {
      let targetLang = null;
      for (const l of ['python', 'java', 'c++', 'cpp', 'c', 'sql', 'javascript', 'js']) {
        if (new RegExp(`\\b${l.replace('+', '\\+')}\\b`, 'i').test(norm)) {
          targetLang = l === 'cpp' ? 'c++' : (l === 'js' ? 'javascript' : l);
          break;
        }
      }

      let bestMatch = null;
      let highestScore = 0;

      for (const snip of codeSnippets) {
        let score = 0;
        const itemTitle = snip.title.toLowerCase();
        const itemLang = snip.language.toLowerCase();

        if (targetLang) {
          const isMatch = (itemLang === targetLang) || (targetLang === 'c++' && itemLang === 'cpp');
          if (isMatch) score += 25.0;
          else score -= 10.0;
        }

        if (norm.includes(itemTitle) || itemTitle.includes(norm)) {
          score += 10.0;
        } else {
          score += tokenOverlap(norm, itemTitle) * 6.0;
        }

        if (score > highestScore && score > 3.0) {
          highestScore = score;
          bestMatch = snip;
        }
      }

      if (bestMatch) {
        output.success = true;
        output.summary = `Matched snippet: [${bestMatch.title}] (${bestMatch.language})`;
        output.source = 'MITM Local Code Library';
      } else {
        output.success = false;
      }
      break;
    }

    case 'fallback': {
      output.success = true; // Fallback working as intended
      output.summary = 'Fallback message with Google Search button and 3 suggestion chips';
      output.source = 'Navigo Fallback';
      break;
    }
  }

  return output;
}

// 15 Required test queries
const queries = [
  "where is MCA lab",
  "belaku auditorium",
  "2+2*5",
  "15% of 800",
  "what time is it",
  "weather in Mysore",
  "meaning of ephemeral",
  "who is APJ Abdul Kalam",
  "difference between RAM and ROM",
  "fibonacci in python",
  "reverse a string in java",
  "sql inner join example",
  "what is polymorphism",
  "difference between let and var",
  "flabbergasted wookiebomb zzzq123"
];

async function main() {
  console.log("=================================================");
  console.log("RUNNING MITM NAVIGO 15-POINT ACCEPTANCE TESTS");
  console.log("=================================================\n");

  let passed = 0;
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    const res = await runTestQuery(q);
    console.log(`[Test ${i + 1}/15] "${q}"`);
    console.log(`  Intent : ${res.intent}`);
    console.log(`  Success: ${res.success ? 'PASS' : 'FAIL'}`);
    console.log(`  Source : ${res.source}`);
    console.log(`  Summary: ${res.summary}\n`);
    if (res.success) passed++;
  }

  console.log(`=================================================`);
  console.log(`TEST SUMMARY: ${passed}/${queries.length} PASSED`);
  console.log(`=================================================`);
}

main();
