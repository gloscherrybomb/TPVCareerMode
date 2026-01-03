# Season Content Requirements

This document outlines what is needed to add a new season to TPV Career Mode. Use this as a checklist when preparing Season 2 or any future season.

## Overview

Each season requires:
1. Configuration data (events, stages, requirements)
2. Visual assets (route images, etc.)
3. Narrative content (stories, interview questions)
4. Database schema support (already built for S2+)

---

## 1. Season Configuration

### Required in `season-config.js`

Add a new entry to `SEASON_DEFINITIONS`:

```javascript
SEASON_DEFINITIONS[2] = {
  id: 2,
  name: "Season 2",
  subtitle: "Continental Pro",  // Displayed in UI
  eventRange: { start: 16, end: 30 },  // Event ID range for this season
  stageCount: 9,  // Number of stages (can differ from S1)

  stageRequirements: {
    // Define each stage's requirements
    1: { type: 'fixed', eventId: 16 },
    2: { type: 'fixed', eventId: 17 },
    3: { type: 'choice', eventIds: [21, 22, 23, 24, 25, 26, 27] },
    4: { type: 'fixed', eventId: 18 },
    5: { type: 'fixed', eventId: 19 },
    6: { type: 'choice', eventIds: [21, 22, 23, 24, 25, 26, 27] },
    7: { type: 'fixed', eventId: 20 },
    8: { type: 'choice', eventIds: [21, 22, 23, 24, 25, 26, 27] },
    9: { type: 'tour', eventIds: [28, 29, 30] }
  },

  events: {
    16: { name: 'Event Name', type: 'criterium', distance: '25 km', ... },
    17: { name: 'Event Name', type: 'road', distance: '45 km', ... },
    // ... define all events 16-30
  },

  unlockRequirements: {
    previousSeason: 1,
    requireComplete: true  // Must complete S1 to access S2
  },

  status: 'released',  // Change from 'coming_soon' when ready to launch
  releaseDate: 'Spring 2026'
};
```

### Stage Types

| Type | Description |
|------|-------------|
| `fixed` | Mandatory event, user must complete this specific event |
| `choice` | User selects one event from a pool of optional events |
| `tour` | Multi-stage event (like Local Tour), all events must be completed |

---

## 2. Event Definitions

### Required for Each Event

For each event in the season, provide the following:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | string | Display name of the event | "Alpine Challenge" |
| `type` | string | Event type | "criterium", "road", "time_trial", "velodrome", "points_race" |
| `distance` | string | Race distance | "45.2 km" |
| `description` | string | Narrative description | "A punishing mountain stage..." |
| `terrain` | string | Terrain type | "flat", "rolling", "hilly", "mountainous" |
| `expectedTimeRange` | object | Min/max expected times | `{ min: 3600, max: 7200 }` (seconds) |
| `expectedDistance` | number | Distance in meters | 45200 |

### Event Numbering

- Season 1: Events 1-15
- Season 2: Events 16-30
- Season 3: Events 31-45
- Season 4: Events 46-60
- Season 5: Events 61-75
- Special Events: 101+ (career-wide, outside seasons)

---

## 3. Visual Assets

### Route Images

For each event, provide a route map image:

| Asset | Filename Pattern | Size | Format |
|-------|------------------|------|--------|
| Route map | `routes/event_XX_route.png` | 800x600 recommended | PNG |

Example: `routes/event_16_route.png`, `routes/event_17_route.png`, etc.

### Event Cards (Optional)

If using custom event card images:

| Asset | Filename Pattern | Size | Format |
|-------|------------------|------|--------|
| Event card | `images/events/event_XX.jpg` | 400x300 | JPG |

---

## 4. Narrative Content

### Season Intro Narrative

Write an introduction story for when the user starts the season:

```
After conquering the local amateur circuit, you've caught the attention of
continental teams. Season 2 takes you to bigger stages, tougher competition,
and higher stakes. The road to the World Tour begins here...
```

### Per-Event Narratives

For each event, provide race-specific story templates that can be used in result processing:

```javascript
event16Narratives: {
  victory: "A dominant display in the Alpine Challenge...",
  podium: "Fighting to the line, you secured a podium spot...",
  topTen: "A solid result on the continental stage...",
  finish: "You crossed the line, gaining valuable experience..."
}
```

### Season Completion Narrative

Write a wrap-up story for when the user completes the season:

```
Season 2 is complete. You've proven yourself on the continental circuit,
facing elite riders and challenging courses. Your performances have not
gone unnoticed...
```

---

## 5. Interview Questions

### New Interview Prompts

Create new interview questions appropriate for the season's level:

```javascript
season2InterviewQuestions: [
  {
    id: 's2_q1',
    situation: 'continental_debut',
    question: "How does it feel racing against continental-level competition?",
    options: [
      { text: "I'm ready to prove I belong here.", personality: { confidence: +5 } },
      { text: "It's a learning experience.", personality: { humility: +5 } },
      // ...
    ]
  },
  // ... more questions
]
```

---

## 6. Bot/AI Opponent Configuration

### ARR Ranges

Define the difficulty scaling for AI opponents in this season:

```javascript
season2BotConfig: {
  arrRange: { min: 120, max: 180 },  // Higher than S1
  eliteRiderChance: 0.15,  // 15% chance of elite rider in field
  packDensity: 'medium'
}
```

---

## 7. Database Schema

Results for Season 2+ are stored in a nested structure:

```
users/{uid}/
  currentSeason: 2

  seasons/
    season2/
      event16Results: { position, time, points, ... }
      event17Results: { ... }
      ...
      complete: boolean
      rank: number
      standings: array
      currentStage: number
      completedStages: array
      completedOptionalEvents: array
      choiceSelections: { stageNum: eventId }
      totalPoints: number
```

This structure is automatically handled by `season-data-helpers.js`.

---

## 8. Pre-Launch Checklist

Before launching a new season:

### Configuration
- [ ] Season definition added to `SEASON_DEFINITIONS`
- [ ] All events defined with complete metadata
- [ ] Stage requirements defined
- [ ] Event types and distances specified
- [ ] Expected time ranges calibrated

### Assets
- [ ] Route images created for all events
- [ ] Event descriptions written
- [ ] All assets uploaded to correct locations

### Narrative
- [ ] Season intro narrative written
- [ ] Per-event narratives prepared
- [ ] Season completion narrative written
- [ ] Interview questions created

### Technical
- [ ] `status` changed from `'coming_soon'` to `'released'`
- [ ] Bot difficulty curves configured
- [ ] Season unlock logic tested

### Testing
- [ ] Complete playthrough of all events
- [ ] Season completion flow tested
- [ ] Previous season → new season transition tested
- [ ] All UI elements display correctly
- [ ] Standings calculate correctly
- [ ] Historical view works for previous seasons

---

## 9. Timeline Recommendations

### Phase 1: Content Creation (4-6 weeks before launch)
- Define all events and their properties
- Create route images
- Write narratives

### Phase 2: Configuration (2-3 weeks before launch)
- Add season to `SEASON_DEFINITIONS`
- Configure bot difficulty
- Create interview questions

### Phase 3: Testing (1-2 weeks before launch)
- Full playthrough testing
- Edge case testing
- Performance testing

### Phase 4: Launch
- Change status to 'released'
- Monitor for issues
- Gather user feedback

---

## Example: Season 2 Event List Template

| Event ID | Name | Type | Distance | Stage |
|----------|------|------|----------|-------|
| 16 | TBD | TBD | TBD | 1 (fixed) |
| 17 | TBD | TBD | TBD | 2 (fixed) |
| 18 | TBD | TBD | TBD | 4 (fixed) |
| 19 | TBD | TBD | TBD | 5 (fixed) |
| 20 | TBD | TBD | TBD | 7 (fixed) |
| 21 | TBD | TBD | TBD | 3/6/8 (choice) |
| 22 | TBD | TBD | TBD | 3/6/8 (choice) |
| 23 | TBD | TBD | TBD | 3/6/8 (choice) |
| 24 | TBD | TBD | TBD | 3/6/8 (choice) |
| 25 | TBD | TBD | TBD | 3/6/8 (choice) |
| 26 | TBD | TBD | TBD | 3/6/8 (choice) |
| 27 | TBD | TBD | TBD | 3/6/8 (choice) |
| 28 | TBD (Tour Stage 1) | TBD | TBD | 9 (tour) |
| 29 | TBD (Tour Stage 2) | TBD | TBD | 9 (tour) |
| 30 | TBD (Tour Stage 3) | TBD | TBD | 9 (tour) |

---

## Questions to Answer Before Starting Season 2

1. Will Season 2 follow the same 9-stage structure as Season 1?
2. How many optional events will be available?
3. What is the difficulty increase from Season 1?
4. Will there be new special events exclusive to Season 2?
5. Any new game mechanics being introduced?
