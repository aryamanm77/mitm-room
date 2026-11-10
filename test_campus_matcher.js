// MITM Navigo - 100+ Question Campus Matcher Acceptance Test Suite
// Tests 100+ realistic queries across all 16 categories, typos, Kanglish, Hinglish, Kannada script,
// multi-part queries, follow-ups, and room cards.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const campusData = JSON.parse(fs.readFileSync(path.join(__dirname, 'campus-data.json'), 'utf8'));
const synonyms = JSON.parse(fs.readFileSync(path.join(__dirname, 'synonyms.json'), 'utf8'));
const roomsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'rooms_data.json'), 'utf8'));

// Test normalization
function normalizeText(str) {
  if (!str) return '';
  let norm = str
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/^(can you please tell me|could you please tell me|please tell me|can you tell me|tell me about|tell me|what is the|what are the|can you give me|give me|show me|explain to me|explain|please|hey navigo|navigo)\s+/i, '')
    .replace(/[?!.,;:]+$/, '')
    .trim();

  norm = norm
    .replace(/ಕ್ಯಾಂಟೀನ್/g, 'canteen ')
    .replace(/ಗ್ರಂಥಾಲಯ/g, 'library ')
    .replace(/ಹಾಸ್ಟೆಲ್/g, 'hostel ')
    .replace(/ಶುಲ್ಕ/g, 'fees ')
    .replace(/ಬಸ್/g, 'bus ')
    .replace(/ಪ್ರವೇಶ/g, 'admission ')
    .replace(/ಬೆಳಕು/g, 'belaku ')
    .replace(/ಶೌಚಾಲಯ/g, 'washroom restroom ')
    .replace(/ಕುಡಿಯುವ ನೀರು/g, 'drinking water ')
    .replace(/ಸಂಪರ್ಕ/g, 'contact phone ')
    .replace(/ಮೆಟ್ಟಿಲು/g, 'staircase ')
    .replace(/ಉದ್ಯೋಗ|ಪ್ಲೇಸ್‌ಮೆಂಟ್/g, 'placement job ')
    .replace(/ತರಗತಿ/g, 'classroom class ')
    .replace(/ಎಲ್ಲಿದೆ|ಯಾವಾಗ|ಹೇಗೆ/g, 'location route ');

  return norm.trim();
}

function tokenize(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);
}

function similarityRatio(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  
  const costs = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longer.length - costs[shorter.length]) / longer.length;
}

function tokenOverlap(query, target) {
  const qTokens = tokenize(query).filter(t => t.length > 2);
  const tTokens = tokenize(target).filter(t => t.length > 2);
  if (!qTokens.length || !tTokens.length) return 0;
  let matches = 0;
  for (const q of qTokens) {
    if (tTokens.some(t => t.includes(q) || q.includes(t) || similarityRatio(q, t) > 0.75)) {
      matches++;
    }
  }
  return matches / qTokens.length;
}

function expandTokens(tokens) {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    if (synonyms.kannada_words && synonyms.kannada_words[token]) {
      tokenize(synonyms.kannada_words[token]).forEach(t => expanded.add(t));
    }
    if (synonyms.hindi_words && synonyms.hindi_words[token]) {
      tokenize(synonyms.hindi_words[token]).forEach(t => expanded.add(t));
    }
    for (const [root, variants] of Object.entries(synonyms)) {
      if (Array.isArray(variants)) {
        if (variants.includes(token) || variants.some(v => similarityRatio(token, v) > 0.8)) {
          expanded.add(root);
          variants.forEach(v => expanded.add(v));
        }
      }
    }
  }
  return Array.from(expanded);
}

// Global context tracker for follow-ups
let activeContext = { lastEntryId: null, lastTopic: null };

function evaluateQuery(rawQuery) {
  const norm = normalizeText(rawQuery);

  // 1. Multi-part
  if (/\b(and\s+(?:what\s+about|the|what\s+is|what\s+are)?|as\s+well\s+as)\b/i.test(norm) && !norm.includes('difference between')) {
    const parts = norm.split(/\b(?:and|as well as)\b/i).map(p => p.trim()).filter(p => p.length > 2);
    if (parts.length > 1) {
      let passedParts = 0;
      for (const p of parts) {
        const subRes = evaluateQuery(p);
        if (subRes.success) passedParts++;
      }
      return {
        query: rawQuery,
        matchedType: 'multi_part',
        target: `${passedParts}/${parts.length} parts resolved`,
        success: passedParts > 0
      };
    }
  }

  // 2. Follow-up
  const followUpSignals = /^(what about|where is it|and the|how about|what is its|timings|fees|how to reach|contact number|where)$/i;
  if (followUpSignals.test(norm) && activeContext.lastEntryId) {
    const matched = campusData.entries.find(e => e.id === activeContext.lastEntryId);
    return {
      query: rawQuery,
      matchedType: 'follow_up',
      target: matched ? matched.title : 'None',
      success: !!matched
    };
  }

  // 3. Room match
  let roomMatch = norm.match(/\b(?:room|lab|cabin|office|lh|hall|no\.?|#)\s*([0-9]{1,3}[a-z]?)\b/i);
  if (!roomMatch) {
    roomMatch = norm.match(/\b(1[0-9]{2}|2[0-9]{2}|3[0-9]{2}|4[0-9]{2}|5[0-9]{2})\b/);
  }

  let foundRoom = null;
  if (roomMatch && roomMatch[1] && roomsData[roomMatch[1]]) {
    foundRoom = { id: roomMatch[1], data: roomsData[roomMatch[1]] };
  } else {
    for (const [k, v] of Object.entries(roomsData)) {
      const hasKey = new RegExp(`\\b${k}\\b`, 'i').test(norm);
      const hasNum = v.room_number && new RegExp(`\\b${v.room_number}\\b`, 'i').test(norm);
      const hasLabel = v.label && norm.includes(v.label.toLowerCase());
      if (hasKey || hasNum || hasLabel) {
        foundRoom = { id: k, data: v };
        break;
      }
    }
  }

  if (foundRoom) {
    activeContext.lastEntryId = foundRoom.id;
    activeContext.lastTopic = foundRoom.data.label || foundRoom.id;
    return {
      query: rawQuery,
      matchedType: 'room_card',
      target: `Room ${foundRoom.id} (${foundRoom.data.college || 'Engineering'})`,
      success: true
    };
  }

  // 4. Match campus entries
  const qTokens = tokenize(norm);
  const expandedTokens = expandTokens(qTokens);

  let bestEntry = null;
  let highestScore = 0;

  for (const entry of campusData.entries) {
    let score = 0;
    const title = entry.title.toLowerCase();
    const keywords = (entry.keywords || []).map(k => k.toLowerCase());
    const aliases = (entry.aliases || []).map(a => a.toLowerCase());
    const examples = (entry.question_examples || []).map(e => e.toLowerCase());

    if (norm.includes(title) || title.includes(norm)) score += 20.0;

    for (const alias of aliases) {
      if (norm.includes(alias)) score += 15.0;
      else if (similarityRatio(norm, alias) > 0.8) score += 12.0;
    }

    for (const ex of examples) {
      if (norm === ex) score += 25.0;
      else {
        const sim = similarityRatio(norm, ex);
        if (sim > 0.75) score += 15.0 * sim;
        else {
          const overlap = tokenOverlap(norm, ex);
          if (overlap > 0.5) score += 10.0 * overlap;
        }
      }
    }

    for (const token of expandedTokens) {
      if (keywords.includes(token)) score += 4.0;
      if (title.includes(token)) score += 3.0;
    }

    if (score > highestScore && score >= 4.0) {
      highestScore = score;
      bestEntry = entry;
    }
  }

  if (bestEntry) {
    activeContext.lastEntryId = bestEntry.id;
    activeContext.lastTopic = bestEntry.title;
    return {
      query: rawQuery,
      matchedType: 'campus_entry',
      target: `[${bestEntry.category}] ${bestEntry.title}`,
      score: highestScore,
      success: true
    };
  }

  return {
    query: rawQuery,
    matchedType: 'none',
    target: 'Unmatched',
    score: highestScore,
    success: false
  };
}

// 100+ Test Questions Suite
const TEST_QUESTIONS = [
  // Category 1: About the college
  "Tell me about MIT Mysore",
  "about college",
  "history of mitm",
  "who founded the college",
  "when was mit mysore established",
  "mitm yavaga start aytu",
  "college bagge heli",
  "is mitm vtu affiliated",
  "naac accreditation of mitm",
  "is mitm autonomous or affiliated",

  // Category 2: Contact
  "What is the contact number of MIT Mysore?",
  "principal email id",
  "mitm phone number",
  "college phone number enu",
  "how to reach mit mysore",
  "directions to college",
  "distance from mysore railway station",
  "which bus goes to mitm",
  "college ge hege hogodu",
  "office hours of administrative block",

  // Category 3: Courses
  "What engineering courses are offered at MIT Mysore?",
  "branches available",
  "be branches list",
  "does mitm have cse and aids",
  "cse branch ideya",
  "does mitm offer mba and mca",
  "mca course details",
  "bca program in mitm",
  "pharmacy courses in campus",
  "eligibility criteria for be admission",

  // Category 4: Admissions
  "How to get admission into MIT Mysore?",
  "admission process",
  "kcet admission procedure",
  "comedk admission",
  "management quota admission",
  "mitm ge admission hege togollodu",
  "documents required for admission reporting",
  "what certificates to bring for joining",
  "admission checklist",
  "marks card original submit madbeka",

  // Category 5: Fees & Scholarships
  "What is the fee structure and scholarship details?",
  "fees structure for cse",
  "college fee eshtu",
  "scholarship details",
  "ssp scholarship application",
  "how to pay college fees",
  "dd name for fee payment",
  "refund policy upon cancellation",
  "vidyasiri scholarship apply madodu hege",
  "fee details pls",

  // Category 6: Departments
  "Tell me about the Computer Science and Engineering department",
  "cse department",
  "where are cse labs",
  "where is ise department",
  "information science labs",
  "where is ece department and labs",
  "dsp lab location",
  "where is mechanical department and workshop",
  "machine shop location",
  "civil engineering department",

  // Category 7: Buildings & Indoor Navigation
  "How is the Engineering Academic Block organized across floors?",
  "engineering block floors",
  "ground floor rooms",
  "first floor engineering",
  "where is belaku auditorium",
  "belaku auditorium location",
  "belaku ge hege hogodu",
  "where is mca lab 1",
  "mca lab 1 route",
  "centre for future skills location",
  "where are restrooms located",
  "drinking water location",
  "washroom elli ide",
  "what is point a admission staircase",
  "what is point c mech staircase",

  // Category 8: Facilities
  "What are the library timings and facilities?",
  "library timings",
  "where is central library",
  "library yavaga open aguthe",
  "where is the campus canteen",
  "canteen timings",
  "canteen food options",
  "canteen elli ide",
  "hostel facilities and fees",
  "boys hostel in mitm",
  "girls hostel",
  "hostel fee eshtu",
  "what are the college bus routes",
  "college bus timings",
  "bus routes to mysore",
  "bus pass hege madodu",
  "sports and gym facilities",
  "cricket ground in college",
  "medical facility on campus",
  "where is ayurveda hospital located",

  // Category 9: Academics
  "What is the attendance rule in VTU?",
  "minimum attendance percentage",
  "attendance percentage eshtu beku",
  "cie exam pattern",
  "class timings daily",
  "when do classes start in the morning",
  "lunch break timings",

  // Category 10: Placements
  "What are the placement statistics and top recruiters?",
  "placement statistics",
  "highest package in mitm",
  "top recruiters list",
  "placement hegidhe college alli",
  "companies visiting mitm",
  "placement eligibility criteria",

  // Category 11: Student Life & Rules
  "What clubs and fests happen at MIT Mysore?",
  "college fest name",
  "mahotsav cultural fest",
  "anti ragging committee",
  "how to get college id card",
  "ksrtc bus pass attestation",
  "dress code rules",
  "is mobile allowed in class",
  "id card compulsory rule",

  // Category 12: Notices, Alumni, Emergency & Guides
  "Where are official college notices published?",
  "latest announcements and circulars",
  "alumni association of mitm",
  "who do I contact in emergency",
  "lost and found office",
  "first day guide for new students",
  "where to go on day 1",
  "visitor guide for parents",
  "where to park car on campus",
  "how to use mitm navigo app",

  // Category 13: Room Number Cards
  "where is room 117",
  "room 205",
  "211 PE lab",
  "room 123",
  "BCA 201",

  // Category 14: Typos & Short Lazy Queries
  "libary timing",
  "cantin menu",
  "pharmasy block",
  "belku audi",
  "plcmnt package",

  // Category 15: Kannada Script & Kanglish
  "ಕ್ಯಾಂಟೀನ್ ಎಲ್ಲಿದೆ",
  "ಹಾಸ್ಟೆಲ್ ಶುಲ್ಕ ಎಷ್ಟು",
  "ಗ್ರಂಥಾಲಯದ ಸಮಯ",
  "ಬೆಳಕು ಸಭಾಂಗಣ ಎಲ್ಲಿದೆ",
  "canteen yelli ide",
  "hostel eshtu",
  "bus timing yavaga",

  // Category 16: Multi-Part & Follow-ups
  "hostel fee and mess timing",
  "where is canteen and library timings",
  "what about its timings?"
];

function runTestSuite() {
  console.log("=================================================");
  console.log("RUNNING MITM NAVIGO 100+ QUESTION TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const q = TEST_QUESTIONS[i];
    const res = evaluateQuery(q);

    const mark = res.success ? "PASS" : "FAIL";
    if (res.success) {
      passed++;
      console.log(`[#${String(i + 1).padStart(3, '0')}] [${mark}] "${q}" -> ${res.target} (${res.matchedType})`);
    } else {
      failed++;
      console.log(`[#${String(i + 1).padStart(3, '0')}] [${mark}] "${q}" -> FAILED TO MATCH`);
    }
  }

  console.log("\n=================================================");
  console.log(`TEST SUITE RESULTS: ${passed}/${TEST_QUESTIONS.length} PASSED (${((passed / TEST_QUESTIONS.length) * 100).toFixed(1)}%)`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
