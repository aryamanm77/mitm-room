// MITM Navigo - Campus Data Validation Script
// Validates schema, required fields, duplicate IDs, link integrity, and question phrasing counts

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const campusDataFile = path.join(__dirname, 'campus-data.json');
const synonymsFile = path.join(__dirname, 'synonyms.json');
const roomsDataFile = path.join(__dirname, 'rooms_data.json');

const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function validate() {
  console.log("=================================================");
  console.log("VALIDATING MITM NAVIGO CAMPUS KNOWLEDGE BASE");
  console.log("=================================================\n");

  let errors = [];
  let warnings = [];

  // 1. Check file existence
  if (!fs.existsSync(campusDataFile)) {
    console.error("FATAL: campus-data.json not found!");
    process.exit(1);
  }

  const campusData = JSON.parse(fs.readFileSync(campusDataFile, 'utf8'));
  const synonyms = fs.existsSync(synonymsFile) ? JSON.parse(fs.readFileSync(synonymsFile, 'utf8')) : null;
  const roomsData = fs.existsSync(roomsDataFile) ? JSON.parse(fs.readFileSync(roomsDataFile, 'utf8')) : {};

  const entries = campusData.entries || [];
  const validCategories = new Set([
    "about", "contact", "courses", "admissions", "fees_scholarships",
    "departments", "buildings_navigation", "facilities", "academics",
    "placements", "student_life", "rules_policies", "notices_events",
    "alumni_research", "emergency_help", "app_help"
  ]);

  const seenIds = new Set();
  const categoryCount = {};

  console.log(`Checking ${entries.length} entries in campus-data.json...\n`);

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const prefix = `[Entry ${i + 1} - ${e.id || 'NO_ID'}]`;

    // ID check
    if (!e.id) {
      errors.push(`${prefix}: Missing required field 'id'`);
    } else if (seenIds.has(e.id)) {
      errors.push(`${prefix}: Duplicate ID '${e.id}' detected`);
    } else {
      seenIds.add(e.id);
    }

    // Required fields check
    const requiredFields = ['title', 'category', 'keywords', 'aliases', 'question_examples', 'answer_short', 'answer_detail'];
    for (const f of requiredFields) {
      if (!e[f]) {
        errors.push(`${prefix}: Missing required field '${f}'`);
      }
    }

    // Category validity
    if (e.category) {
      if (!validCategories.has(e.category)) {
        errors.push(`${prefix}: Invalid category '${e.category}'`);
      } else {
        categoryCount[e.category] = (categoryCount[e.category] || 0) + 1;
      }
    }

    // Question examples threshold (at least 10)
    if (e.question_examples) {
      if (!Array.isArray(e.question_examples)) {
        errors.push(`${prefix}: 'question_examples' must be an array`);
      } else if (e.question_examples.length < 10) {
        warnings.push(`${prefix}: Has only ${e.question_examples.length} question examples (recommend >= 10)`);
      }
    }

    // Link integrity check
    if (e.links && Array.isArray(e.links)) {
      for (const link of e.links) {
        if (!link.title || !link.url) {
          errors.push(`${prefix}: Link missing title or url`);
        } else if (link.url.startsWith('#room=')) {
          const roomKey = link.url.replace('#room=', '');
          const hotspotMatch = campusData.hotspots && campusData.hotspots.some(h => h.name.toLowerCase() === roomKey.toLowerCase() || (h.aliases && h.aliases.some(a => a.toLowerCase() === roomKey.toLowerCase())));
          const roomMatch = roomsData && roomsData[roomKey];
          if (!hotspotMatch && !roomMatch) {
            warnings.push(`${prefix}: Internal room link '${roomKey}' not found in rooms_data.json or hotspots`);
          }
        }
      }
    }

    // Emoji check
    const rawJson = JSON.stringify(e);
    const emojiMatch = rawJson.match(emojiRegex);
    if (emojiMatch) {
      errors.push(`${prefix}: Prohibited emoji character detected: ${emojiMatch[0]}`);
    }
  }

  // Synonyms check
  if (!synonyms) {
    warnings.push("synonyms.json is missing or unreadable");
  } else {
    console.log(`Synonyms dictionary verified with ${Object.keys(synonyms).length} root groups.`);
  }

  // Print category coverage table
  console.log("\n-------------------------------------------------");
  console.log("CATEGORY COVERAGE SUMMARY");
  console.log("-------------------------------------------------");
  for (const cat of validCategories) {
    const count = categoryCount[cat] || 0;
    const status = count > 0 ? "OK" : "EMPTY";
    console.log(`  ${cat.padEnd(25)}: ${count} entries [${status}]`);
  }

  console.log("\n-------------------------------------------------");
  console.log("VALIDATION RESULTS");
  console.log("-------------------------------------------------");
  console.log(`Total Errors  : ${errors.length}`);
  console.log(`Total Warnings: ${warnings.length}`);

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    warnings.forEach(w => console.log(`  ! ${w}`));
  }

  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach(err => console.log(`  X ${err}`));
    console.log("\nRESULT: FAILED");
    process.exit(1);
  } else {
    console.log("\nRESULT: ALL CHECKS PASSED PERFECTLY (100% VALID)");
  }
}

validate();
