#!/usr/bin/env node

// check-file-order.js - Diagnostic script to check CSV file timestamps

const fs = require('fs');
const path = require('path');

const season = 1;
const baseDir = `race_results/season_${season}`;

console.log('Checking CSV file order...\n');

if (!fs.existsSync(baseDir)) {
  console.log(`❌ Directory ${baseDir} not found`);
  process.exit(1);
}

const csvFiles = [];

// Find all event directories
const eventDirs = fs.readdirSync(baseDir)
  .filter(d => d.startsWith('event_'));

for (const eventDir of eventDirs) {
  const eventPath = path.join(baseDir, eventDir);
  const eventNum = parseInt(eventDir.replace('event_', ''));
  
  // Find CSV files in this event directory
  const files = fs.readdirSync(eventPath)
    .filter(f => f.endsWith('.csv'));
  
  for (const file of files) {
    const fullPath = path.join(eventPath, file);
    const stats = fs.statSync(fullPath);
    csvFiles.push({
      path: fullPath,
      event: eventNum,
      modifiedTime: stats.mtime.getTime(),
      modifiedDate: stats.mtime
    });
  }
}

// Sort by modification time (chronological order)
csvFiles.sort((a, b) => a.modifiedTime - b.modifiedTime);

console.log('📁 CSV Files Found:\n');
console.log('Processing order (by file timestamp):');
console.log('─'.repeat(80));

csvFiles.forEach((file, index) => {
  console.log(`${index + 1}. Event ${file.event.toString().padEnd(3)} | ${file.modifiedDate.toISOString()} | ${file.path}`);
});

console.log('─'.repeat(80));
console.log(`\nTotal: ${csvFiles.length} files`);

// Check if order matches event numbers
const isInEventOrder = csvFiles.every((file, index) => {
  if (index === 0) return true;
  return file.event >= csvFiles[index - 1].event;
});

console.log('\n📊 Analysis:');
if (isInEventOrder) {
  console.log('✅ Files are in numerical event order (1, 2, 3, 8)');
  console.log('⚠️  This might NOT match the order you raced them!');
  console.log('\n💡 To fix: Touch the files in the order you raced them:');
  console.log('   Example: If you raced 1, 2, 8, 3:');
  console.log('   touch race_results/season_1/event_1/*.csv');
  console.log('   sleep 1');
  console.log('   touch race_results/season_1/event_2/*.csv');
  console.log('   sleep 1');
  console.log('   touch race_results/season_1/event_8/*.csv');
  console.log('   sleep 1');
  console.log('   touch race_results/season_1/event_3/*.csv');
} else {
  console.log('✅ Files are NOT in numerical order');
  console.log('✅ This likely matches your race order!');
}

// Show expected race order
console.log('\n🏁 Expected processing for stage validation:');
console.log('   1. Event 1 → Stage 1');
console.log('   2. Event 2 → Stage 2');
console.log('   3. Event 8 → Stage 3 (choice from 6-12)');
console.log('   4. Event 3 → Stage 4');
