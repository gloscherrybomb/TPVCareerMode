SEASON 1 RIDER STANDINGS POSITION REPORT
========================================

Two scripts are provided to generate the report showing each rider's exact
season standings position as displayed on their standings page.

OPTION 1: Query Firestore Directly (Recommended)
-------------------------------------------------
Script: report-rider-standings-positions.js

This script queries Firestore to get each rider's stored season1Standings
array and calculates their position within it. This gives the EXACT position
that users see on their standings page.

Requirements:
- FIREBASE_SERVICE_ACCOUNT environment variable with service account JSON
- firebase-admin npm package

Usage:
  export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
  node report-rider-standings-positions.js

Output Format:
  Name, X races, Yth place

This matches exactly what users see because it reads the same data that
the standings.html page displays.


OPTION 2: Build Standings from Race Results (Alternative)
----------------------------------------------------------
Script: build-season-standings.js

This script rebuilds the standings from scratch using the exact algorithm
from process-json-results.js, including bot simulation and quintile
stratification.

Requirements:
- Local race_results/season_1/event_*/*.json files

Usage:
  node build-season-standings.js

Note: This approach builds individualized standings for each rider based on
their completed events. The positions may differ from stored Firestore data
because:
1. Bot simulation uses seeded randomness per rider
2. Each rider's standings only include events they completed
3. Missing events 9, 10, 11 (no results files found)


WHICH SCRIPT TO USE?
--------------------
Use report-rider-standings-positions.js if you have Firestore access.
This gives you the exact stored positions that users see.

Use build-season-standings.js only if Firestore is unavailable.
This reconstructs the standings but may differ from stored values.


CURRENT LIMITATION
------------------
Firestore credentials are not available in this environment, so
report-rider-standings-positions.js cannot run yet. The script is ready
and will work once FIREBASE_SERVICE_ACCOUNT is set.

A test run of build-season-standings.js is saved in:
  build-season-standings-output.txt
