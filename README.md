# MITM Navigo - Indoor Campus Navigation & Ask Navigo Assistant
**Maharaja Institute of Technology Mysore (MITM)**

MITM Navigo is the visual wayfinding and indoor corridor navigation system built for Maharaja Institute of Technology Mysore. It guides students, faculty, parents, and visitors through step-by-step corridor photographs directly to 123 classrooms, labs, seminar halls, and departments across all academic blocks.

Included with the navigation suite is **Ask Navigo**, a zero-AI, offline-first client-side chatbot and campus knowledge engine.

---

## Ask Navigo Chatbot Architecture

Ask Navigo adheres strictly to hard constraints:
- **Zero AI / LLM models**: No external neural network API dependencies, no subscriptions, no rate limit failures, and zero cost.
- **Offline-First Local Knowledge**: Instant client-side intent routing for campus locations, 120+ student programming snippets, unit conversions, and mathematical expressions.
- **Fair-Use Keyless APIs**: Real-time Mysore weather via Open-Meteo, dictionary definitions via Wiktionary REST, and encyclopedic lookups via Wikipedia REST.
- **Smart Client-Side Caching**: 24-hour localStorage caching for encyclopedia summaries, definitions, and code lookups; 30-minute caching for weather forecasts.
- **Safe HTML & XSS Mitigation**: Strict text escaping, sanitized markdown-lite rendering, and HTTPS-only external linking.

---

## 16 Campus Knowledge Categories

The campus knowledge base in `campus-data.json` contains structured entries across all 16 domains:

1. **About the College**: Foundation (2007 by Maharaja Education Trust), 11-acre campus in Belawadi, Srirangapatna, vision, mission, VTU permanent affiliation, AICTE approval, NAAC and NBA accreditations.
2. **Contact & Location**: Telephone (+91 8236-292601), principal email, postal address, directions by bus, train, and auto from Mysore Junction and Suburb Bus Stand (~15 km), K.R. Mills landmark, office timings.
3. **Courses & Programs**: B.E. programs in CSE, ISE, ECE, Mechanical, Civil, AI & DS, AI & ML, IoT & Cyber Security, CSBS; Postgraduate MBA, MCA, M.Tech; BCA (3 years); Faculty of Pharmaceutical Sciences (B.Pharm, D.Pharm); 10+2 PCM eligibility requirements.
4. **Admissions**: Admission channels via KCET (KEA), COMEDK, PGCET, KMAT, and Management Quota; documentation checklist for reporting; lateral entry via DCET.
5. **Fees & Scholarships**: Government quota fee regulation by KEA; Post-Matric SSP, Vidyasiri, NSP scholarships; payment via DD, RTGS/NEFT, or online portal; AICTE refund norms.
6. **Departments**: Detailed profiles for CSE, ISE, ECE, Mechanical, Civil, AI & DS, MBA, MCA, BCA, and Pharmaceutical Sciences.
7. **Buildings & Indoor Navigation**: Engineering Academic Block (6 levels, 59 mapped rooms), MBA Block, MCA Block, BCA Block, Pharmacy Block, Belaku Auditorium, Centre for Future Skills, restrooms on all floors, drinking water coolers, staircases Point A (Admission), Point B (Central), Point C (Mech Dept), and corridor photo deep links.
8. **Facilities**: Central Library (8:30 AM - 8:00 PM), Canteen & Cafeteria (8:00 AM - 6:00 PM), on-campus Boys & Girls Hostels, fleet of 100+ college buses, sports grounds (cricket, football, volleyball, badminton), on-campus health clinic & adjacent Maharaja Ayurveda Hospital, parking lots, reprographic/xerox center, campus Wi-Fi.
9. **Academics**: VTU academic regulations, compulsory 75% attendance rule, 3 CIE internal assessments, SGPA/CGPA evaluation, exam results on results.vtu.ac.in, daily lecture hours (9:00 AM - 4:45 PM).
10. **Placements & Careers**: Training & Placement Cell, ETSDP continuous aptitude/coding training, packages averaging 4 LPA with top offers up to 15-19 LPA, recruiters including Infosys, TCS, Wipro, Cognizant, eligibility rules (60% / 6.5 CGPA).
11. **Student Life**: Flagship fest Mahotsav, technical hackathons, coding societies, cultural forums, NSS unit, Anti-Ragging Committee, Seva Sindhu KSRTC bus pass attestation.
12. **Rules & Policies**: Formal dress code, mandatory lab aprons, mandatory ID cards with lanyard, mobile phone restrictions during lectures, zero-tolerance anti-ragging policy.
13. **Notices & Events**: Official announcements portal on mitmysore.in, ground floor notice boards near Point A, VTU notifications portal.
14. **Alumni & Research**: Maharaja Alumni Association (MAA) network, VTU recognized Research Centers for Ph.D. in CSE, ECE, Mech, Civil, and Sciences.
15. **Emergency & Directory**: Campus security desk, ambulance support, Maharaja Ayurveda Hospital, national anti-ragging helpline (1800-180-5522), and "Who Do I Contact For What" directory.
16. **App Help & Guides**: How to use MITM Navigo, First Day Guide for new students, Visitor Guide for parents and guests, Demo Mode toggle, and Report Wrong Info feedback link.

---

## Knowledge Base Schema

Every entry in `campus-data.json` adheres to this clean schema:

```json
{
  "id": "facility_canteen",
  "title": "Campus Canteen & Cafeteria",
  "category": "facilities",
  "keywords": ["canteen", "food", "mess", "lunch", "snacks", "coffee"],
  "aliases": ["canteen timings", "canteen menu", "where is canteen"],
  "question_examples": [
    "Where is the campus canteen and what are its timings?",
    "canteen timings",
    "canteen yelli ide",
    "canteen kahan hai",
    "ಕ್ಯಾಂಟೀನ್ ಎಲ್ಲಿದೆ",
    "I am a visitor looking for breakfast or coffee on campus"
  ],
  "answer_short": "The campus canteen operates from 8:00 AM to 6:00 PM serving hygienic vegetarian food.",
  "answer_detail": "Campus Canteen Details:\n* Timings: 8:00 AM to 6:00 PM.\n* Cuisine: South and North Indian vegetarian meals, dosas, snacks, fresh juice, and beverages.\n* Hygiene: Clean dining hall with separate faculty and student seating.",
  "links": [
    { "title": "View Campus Entrance", "url": "#college=engineering", "type": "college" }
  ]
}
```

---

## How to Edit or Add Campus Facts

All campus facts reside in a single file: `campus-data.json`.
1. Open `campus-data.json`.
2. To edit a fact, search for the relevant `id` (e.g., `facility_canteen` or `contact_main`) and modify the text in `answer_short` or `answer_detail`.
3. To add a new topic, create a new object in the `"entries"` array with a unique `id`, `title`, `category`, `keywords`, `aliases`, `question_examples` (at least 10), `answer_short`, and `answer_detail`.
4. Validate your additions by running:
   ```bash
   npm run validate
   ```
   The validation script checks for required fields, duplicate IDs, broken room links, and phrasing counts.

---

## Smart Matcher Architecture

The matcher in `chatbot.js` executes purely in the browser with sub-5ms response time:

- **Multilingual Tokenizer**: Automatically recognizes Kannada script (ಕ್ಯಾಂಟೀನ್, ಗ್ರಂಥಾಲಯ, ಶುಲ್ಕ, ಬಸ್), romanized Kannada / Kanglish (yelli, eshtu, yavaga, hege, oota, thindi, daari), and Hindi / Hinglish (kahan, kitna, kab, kaise, khana, pani).
- **Synonym Expansion**: `synonyms.json` maps vocabulary roots (e.g., canteen = cafeteria = mess = food court = snacks; fee = tuition = charges = eshtu).
- **Fuzzy Typo Tolerance**: Levenshtein distance matching tolerates student typos (e.g., "libary", "cantin", "pharmasy", "belku").
- **Room Cards**: Detects room numbers (e.g., "117", "205", "MCA Lab 1", "Belaku") and renders a Room Card with room number, floor, college, and a 1-click `[Navigate to this room]` button that loads the photo corridor walkthrough.
- **Multi-Part Queries**: Clauses joined with "and" or "&" (e.g., "hostel fee and mess timing") are split and answered in one combined response.
- **Contextual Follow-ups**: Remembers the last discussed entry in `chatContext`. Queries like "what about its timings?" or "where is it located?" automatically resolve to the previous topic.
- **Confidence Scoring & Suggestions**: Medium-confidence matches automatically present "Did you mean...?" suggestion chips.
- **Missed Questions Logging**: Unanswered or low-confidence questions are logged to `localStorage['navigo_missed_questions']` so administrators can audit missing topics.
- **Report Wrong Info**: Users can tap the warning icon on any answer to generate a pre-filled correction email to `principal@mitmysore.in`.
- **Hidden Demo Mode**: Typing `/demo` toggles demo mode on or off. In demo mode, clearly labeled sample values like `Room 000 (sample)` are populated for UI testing. Normal mode displays only verified facts.

---

## Test Suites & Validation

1. **Schema Validation**:
   ```bash
   npm run validate
   ```
   Verifies all 45 entries for schema compliance, zero emojis, duplicate IDs, and link validity.

2. **148-Question Campus Matcher Acceptance Test**:
   ```bash
   npm test
   ```
   Tests 148 realistic questions across all 16 categories, typos, Kanglish, Hinglish, Kannada script, multi-part questions, follow-ups, and room cards.

3. **General Engine Test**:
   ```bash
   npm run test:all
   ```
   Executes both the 15-point core capability test (maths, weather, wiktionary, coding snippets) and the 148-question campus test suite.

---

## Coverage Report

| Category | Entries Count | Phrasings Count | Status |
|---|---|---|---|
| About the College | 3 | 37 | Verified |
| Contact & Directions | 3 | 36 | Verified |
| Courses & Eligibility | 3 | 37 | Verified |
| Admissions & Documents | 2 | 24 | Verified |
| Fees & Scholarships | 2 | 24 | Verified |
| Departments | 7 | 84 | Verified |
| Buildings & Navigation | 5 | 60 | Verified |
| Facilities | 6 | 72 | Verified |
| Academics & Exams | 2 | 24 | Verified |
| Placements & Careers | 2 | 24 | Verified |
| Student Life & Clubs | 2 | 24 | Verified |
| Rules & Policies | 1 | 12 | Verified |
| Notices & Events | 1 | 12 | Verified |
| Alumni & Research | 1 | 12 | Verified |
| Emergency & Directory | 1 | 12 | Verified |
| App Help & Guides | 4 | 48 | Verified |
| **Total** | **45** | **542** | **100% Passed** |

---

## Honest Evaluation: What Needs Additional Data

### What Works Very Well
- **Room Numbers & Direct Walkthroughs**: Instantaneous retrieval of all 123 mapped campus rooms with 1-tap navigation launch.
- **Multilingual Common Inquiries**: English, Kanglish, Hinglish, and Kannada script for canteen, library, hostel, bus, fees, and admissions resolve accurately.
- **Department Profiles & Facilities**: Accurate details for all 5 blocks and major facilities.

### What the Bot Cannot Answer Yet (Data to Add Later)
- **Specific Annual Fee Amounts for Management Quota**: Management seat fees vary by year and branch and are determined privately by the Trust. The bot safely directs users to the Administrative Office at Point A.
- **Individual Faculty Phone Numbers**: Faculty mobile numbers are not published online for privacy. The bot provides official departmental channels and principal email.
- **Exact Daily Cafeteria Special Dishes**: While general vegetarian cuisine and breakfast options are mapped, day-specific daily menu changes are not stored.
- **Live Bus GPS Tracking**: Bus routes and departure times (4:50 PM) are available, but live real-time GPS locations are not supported.
