// Season 1 Event Data
const eventData = {
    1: {
        number: "01",
        name: "Coast and Roast Crit",
        subtitle: "A fast-paced waterfront criterium",
        type: "Criterium",
        level: "Local Amateur",
        mandatory: true,
        distance: "23.4 km",
        climbing: "124 m",
        course: "Coast and Roast",
        format: "4 laps",
        maxPoints: 65,
        icon: "🔄",
        description: `Hosted each spring in the coastal town of Georgetown, the Coast and Roast Crit is a short, fast circuit race known for its sweeping waterfront stretch and a handful of tight corners that keep the bunch on edge. 

The course rewards efficient pack movement and quick accelerations, especially in the final laps when the pace traditionally lifts with the ocean breeze at riders' backs. 

It's a straightforward but energetic event—an ideal early-season chance to test sprint form, refine positioning, and get a feel for local criterium racing.`,
        strategy: "Stay alert through the waterfront turns and conserve energy in the draft. The final two laps are where the race is won—position yourself well before the last kilometer and be ready for a sharp sprint to the line.",
        routeDetails: {
            start: "Georgetown Waterfront",
            keyPoint: "Coastal Bend (technical section)",
            difficulty: "Fast pace, technical corners",
            finish: "Georgetown Waterfront"
        },
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTI0MzEsImFjY2Vzc0NvZGUiOjE4NjA2MCwicmVxdWlyZUFjY2Vzc0NvZGUiOnRydWUsInRpdGxlVGVtcGxhdGUiOiJDb2FzdCBhbmQgUm9hc3QgQ3JpdCAtIFRQViBDYXJlZXIgTW9kZSBTdGFnZSAxIn0="
    },
    2: {
        number: "02",
        name: "Island Classic",
        subtitle: "A local proving ground for aspiring riders",
        type: "Classic",
        level: "Local Amateur",
        mandatory: true,
        distance: "36.5 km",
        climbing: "122 m",
        course: "So Near Yet So Far",
        format: "1 lap",
        maxPoints: 95,
        icon: "🚴",
        description: `A local classic that has earned its reputation as a proving ground for aspiring riders. This medium length race is where many careers have taken their first meaningful step forward—consistent performances here catch the attention of scouts and bigger teams.

The course's deceptive nature is part of its legend: riders who underestimate it rarely finish well, while those who respect the accumulated difficulty often surprise themselves with strong results.

It's the kind of race where experience counts, but raw talent can still shine through. Win here or even crack the top five, and people start remembering your name.`,
        strategy: "Don't be fooled by the moderate climbing numbers. The rolling nature never gives you a true break. Pace your efforts wisely, stay in contact with the lead group, and save something for the final 5km where the decisive moves typically happen.",
        routeDetails: {
            start: "Island Circuit Entry",
            keyPoint: "Rolling sections (constant pace changes)",
            difficulty: "Deceptively challenging",
            finish: "Island Circuit"
        },
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTExMzksInJlcXVpcmVBY2Nlc3NDb2RlIjp0cnVlLCJ0aXRsZVRlbXBsYXRlIjoiSXNsYW5kIENsYXNzaWMgLSBUUFYgQ2FyZWVyIE1vZGUgU3RhZ2UgMiJ9"
    },
    3: {
        number: "03",
        name: "The Forest Velodrome Elimination",
        subtitle: "Last rider out each lap",
        type: "Track",
        level: "Local Amateur",
        mandatory: true,
        distance: "10.0 km",
        climbing: "0 m",
        course: "Velodrome",
        format: "20 laps elimination race",
        maxPoints: 50,
        icon: "🏟️",
        description: `Held every year under the lights of the Forest Velodrome, this 10 km elimination race challenges riders with a simple rule: the last rider each lap is withdrawn until only one remains.

The atmosphere is always lively, but the focus stays on sharp positioning and repeated high-intensity efforts. It's a compact, tactical event where smart wheel choice and timing matter just as much as raw speed.

This makes it a key early test for any rider entering the local racing scene—you need to be aware, aggressive, and efficient all at once.`,
        strategy: "Never drift to the back. Every lap is critical. Pick your position early, stay near the front third of the group, and be ready to surge when the bell rings. Watch for riders trying to squeeze you out—protect your line and stay smooth.",
        routeDetails: {
            start: "Forest Velodrome Track",
            keyPoint: "Elimination every lap",
            difficulty: "Tactical and intense",
            finish: "Last rider standing wins"
        },
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTI0NzcsImFjY2Vzc0NvZGUiOjE4NjA2MCwicmVxdWlyZUFjY2Vzc0NvZGUiOnRydWUsInRpdGxlVGVtcGxhdGUiOiJGb3Jlc3QgVmVsb2Ryb21lIEVsaW1pbmF0aW9uIC0gVFBWIENhcmVlciBNb2RlIn0=",
        // Custom scoring for 20-participant elimination race
        customScoring: [
            { rank: '1st', points: 50 },
            { rank: '2nd', points: 46 },
            { rank: '3rd', points: 43 },
            { rank: '4th', points: 39 },
            { rank: '5th', points: 38 },
            { rank: '6th-10th', points: '36-28' },
            { rank: '11th-15th', points: '27-19' },
            { rank: '16th-20th', points: '17-10' }
        ],
        scoringNote: "Points awarded based on finishing position (top 20 only)."
    },
    4: {
        number: "04",
        name: "Coastal Loop Time Challenge",
        subtitle: "Twenty minutes of pure power",
        type: "Time Trial",
        level: "Local Amateur",
        mandatory: true,
        distance: "10.7 km",
        climbing: "50 m",
        course: "Coastal Loop",
        format: "20 minutes",
        maxPoints: 50,
        icon: "⏱️",
        description: `The ultimate test of pure power and pacing discipline. Every local rider knows the Coastal Loop—it's where reputations are built on numbers alone. Twenty minutes, perfectly flat, nowhere to hide. This is your FTP laid bare for scouts, coaches, and rival riders to see.

The challenge is deceptively simple: hold your threshold for the full duration and see how far you get. Go out too hard and you'll crack spectacularly in the final five minutes. Too conservative and you'll leave watts on the table.

Nail the pacing and you'll set a personal best that becomes your calling card. Teams pay attention to Coastal Loop results—a strong showing here proves you have the engine to compete at higher levels. It's not glamorous, but in the early stages of a career, a solid twenty-minute number opens doors.`,
        strategy: "Start controlled. Your first 5 minutes should feel almost easy. Build into your rhythm by minute 8, then settle into threshold. The mental game matters here—stay focused on your breathing and power. Push hard in the final 2 minutes when you know you can hold nothing back.",
        routeDetails: {
            start: "Coastal Loop Entry",
            keyPoint: "Flat, exposed terrain",
            difficulty: "Pure FTP test",
            finish: "Maximum distance in 20 minutes"
        },
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTI0OTQsImFjY2Vzc0NvZGUiOjE4NjA2MCwicmVxdWlyZUFjY2Vzc0NvZGUiOnRydWUsInRpdGxlVGVtcGxhdGUiOiJDb2FzdGFsIExvb3AgVGltZSBDaGFsbGVuZ2UgLSBUUFYgQ2FyZWVyIE1vZGUifQ=="
    },
    5: {
        number: "05",
        name: "North Lake Points Race",
        subtitle: "Brutal rolling terrain with points at the worst moments",
        type: "Points Race",
        level: "Local Amateur",
        mandatory: true,
        distance: "19.6 km",
        climbing: "388 m",
        course: "North Lake Loop Reverse",
        format: "4 laps",
        maxPoints: 80,
        icon: "🎯",
        description: `A local specialty that has riders grimacing before they even clip in. The North Lake Loop Reverse is relentlessly rolling—there's no such thing as cruising here, it's always either up or down.

What makes it brutal is the points banner placement: they're positioned at the worst possible moments, forcing you to dig deep when your legs are already screaming. Sprint for points on a climb, recover on a descent, then immediately sprint again. Repeat until someone cracks.

This race rewards riders who can produce power repeatedly under fatigue—exactly the kind of ability that separates good legs from great careers. It's a favorite among scouts looking for riders with mental toughness and the capacity to suffer well. Finish on the podium here and you've proven you can handle whatever a race throws at you. It's as much a test of character as it is fitness.`,
        strategy: "Pick your battles wisely—you can't contest every sprint. Target 2-3 points opportunities where you're strongest. Stay near the front on climbs so you're not chasing back. Mental toughness is key: when it hurts, everyone else is suffering too.",
        routeDetails: {
            start: "North Lake Reverse",
            keyPoint: "Rolling climbs with points banners",
            difficulty: "Relentlessly challenging",
            finish: "Most points wins"
        },
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTI0NjAsImFjY2Vzc0NvZGUiOjE4NjA2MCwicmVxdWlyZUFjY2Vzc0NvZGUiOnRydWUsInRpdGxlVGVtcGxhdGUiOiJOb3J0aCBMYWtlIFBvaW50cyBSYWNlIC0gVFBWIENhcmVlciBNb2RlIn0="
    },
    6: {
        number: "06",
        name: "Easy Hill Climb",
        subtitle: "A straightforward pacing challenge",
        type: "Hill Climb",
        level: "Local Amateur",
        mandatory: false,
        distance: "9.6 km",
        climbing: "174 m",
        course: "Easy Hill Climb",
        format: "Time Trial",
        maxPoints: 50,
        icon: "⛰️",
        description: `The Easy Hill Climb TT is a straightforward test of pacing on a two-part course: a fast, flat opening section followed by a steady 3—4% climb to the line.

With no technical features and no sharp gradients, the challenge is entirely in how evenly you can meter your effort. Riders who go too hard early pay for it the moment the road tilts upward, while those who hold back too much lose free speed on the flats.

It's a clean, controlled time trial that rewards discipline over explosiveness—an ideal early-season benchmark for riders learning to balance tempo and threshold on mixed terrain.`,
        strategy: "Ride the flat section at a controlled tempo—resist the urge to go too hard. As you hit the climb, settle into a sustainable rhythm you can hold to the top. Focus on smooth pedaling and steady breathing. The climb isn't steep enough to stand, so stay seated and grind it out.",
        routeDetails: {
            start: "Flat approach road",
            keyPoint: "Transition to 3-4% climb",
            difficulty: "Pacing discipline required",
            finish: "Top of steady climb"
        },
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTI0NjIsInJlcXVpcmVBY2Nlc3NDb2RlIjp0cnVlLCJ0aXRsZVRlbXBsYXRlIjoiRWFzeSBIaWxsIENsaW1iIC0gVFBWIENhcmVlciBNb2RlIn0="
    },
    7: {
        number: "07",
        name: "Flat Eight Criterium",
        subtitle: "Fast-paced circuit racing",
        type: "Criterium",
        level: "Local Amateur",
        mandatory: false,
        distance: "25.7 km",
        climbing: "117 m",
        course: "Flat Eight",
        format: "3 laps",
        maxPoints: 70,
        icon: "💨",
        description: `The Flat Eight Criterium is a fast-paced local circuit race known for its smooth flow and constant changes in speed as riders rotate through the looping course.

With frequent accelerations and tight pack dynamics, it rewards quick reactions, confident cornering, and the ability to hold position when the pace lifts.

It's a straightforward but energetic crit—an ideal proving ground for riders looking to sharpen their race instincts early in the season.`,
        strategy: "Stay relaxed and trust your bike handling. The pace will yo-yo constantly—don't panic when gaps open briefly. Move up on the outside of corners and drift back through the straights. Watch for late-race attacks and be ready to respond quickly.",
        routeDetails: {
            start: "Figure-eight circuit",
            keyPoint: "Multiple corners per lap",
            difficulty: "Pack dynamics and accelerations",
            finish: "Sprint finish expected"
        },
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTI0NjMsImFjY2Vzc0NvZGUiOjE4NjA2MCwicmVxdWlyZUFjY2Vzc0NvZGUiOnRydWUsInRpdGxlVGVtcGxhdGUiOiJGbGF0IEVpZ2h0IENyaXRlcml1bSAtIFRQViBDYXJlZXIgTW9kZSJ9"
    },
    8: {
        number: "08",
        name: "The Grand Gilbert Fondo",
        subtitle: "Over 50km of varied terrain",
        type: "Classic",
        level: "Local Amateur",
        mandatory: false,
        distance: "52.6 km",
        climbing: "667 m",
        course: "A Grand Day Out",
        format: "1 lap",
        maxPoints: 185,
        icon: "🏔️",
        description: `Covering more than fifty kilometers of varied terrain around Gilbert Island, the Grand Gilbert Fondo is one of the most demanding challenges available at the local level.

The route strings together a series of steady climbs, rolling stretches, and exposed coastal roads, turning the event into a true endurance test rather than a single-effort effort. Riders can expect long periods of sustained work punctuated by decisive rises that gradually wear down the field.

It's the kind of event where pacing matters just as much as strength, and finishing well is often a sign that a rider is ready to move beyond pure local competition. A big adventure and a serious benchmark—this is where developing riders discover what they're really capable of.`,
        strategy: "This is an endurance test, not a sprint. Start conservatively and build into the effort. Fuel and hydrate early and often. On the climbs, find your rhythm and don't get drawn into battles you can't sustain. Save your best effort for the final 10km—that's where the race is decided.",
        routeDetails: {
            start: "Gilbert Island Circuit",
            keyPoint: "Multiple sustained climbs",
            difficulty: "Long endurance challenge",
            finish: "Gilbert Island"
        },
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTI0NjQsImFjY2Vzc0NvZGUiOjE4NjA2MCwicmVxdWlyZUFjY2Vzc0NvZGUiOnRydWUsInRpdGxlVGVtcGxhdGUiOiJHcmFuZCBHaWxiZXJ0IEZvbmRvIC0gVFBWIENhcmVlciBNb2RlIn0="
    },
    9: {
        number: "09",
        name: "Base Camp Classic",
        subtitle: "Pure climbing-focused road race",
        type: "Classic",
        level: "Local Amateur",
        mandatory: false,
        distance: "25.9 km",
        climbing: "295 m",
        course: "Base Camp",
        format: "2 laps",
        maxPoints: 85,
        icon: "🏕️",
        description: `The Base Camp Classic is a pure climbing-focused road race designed to challenge developing riders with a steady procession of uphill efforts.

The course gradually grinds the field down and rewards those who can stay composed as the gradients accumulate. There's little shelter and few opportunities to hide—every rise forces a decision, every false flat tests pacing, and every summit invites someone to attack.

For riders looking to prove their climbing potential early in their career, the Base Camp Classic is the definitive test.`,
        strategy: "Manage your energy over both laps. The first lap should feel controlled—use it to gauge your competition. On lap two, be ready for attacks on every climb. Stay near the front so you can respond without burning matches. If you're a climber, this is your race to win.",
        routeDetails: {
            start: "Base Camp Loop",
            keyPoint: "Continuous climbing efforts",
            difficulty: "Climbing-specific",
            finish: "Final summit"
        },
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTE2MDEsImFjY2Vzc0NvZGUiOjE4NjA2MCwicmVxdWlyZUFjY2Vzc0NvZGUiOnRydWUsInRpdGxlVGVtcGxhdGUiOiJCYXNlIENhbXAgQ2xhc3NpYyAtIFRQViBDYXJlZXIgTW9kZSBDaG9pY2UgRXZlbnQifQ=="
    },
    10: {
        number: "10",
        name: "Beach and Pine TT",
        subtitle: "Coast-hugging endurance time trial",
        type: "Time Trial",
        level: "Local Amateur",
        mandatory: false,
        distance: "25.3 km",
        climbing: "160 m",
        course: "Big Loop",
        format: "1 lap",
        maxPoints: 70,
        icon: "🌊",
        description: `The Beach and Pine TT is a longer, coast-hugging time trial that rewards steady pacing and aerodynamic discipline.

The route follows flat shoreline roads bordered by open water on one side and dense pine stretches on the other, creating a mix of calm sheltered sections and breezier exposed straights.

With no climbs or technical turns to hide behind, it's a pure test of sustained power and focus—an ideal event for riders who want to benchmark their endurance and consistency against the clock.`,
        strategy: "Start at a pace you can hold for the entire distance. Don't let the initial flat sections tempt you into going too hard. Stay aero as much as possible, especially in the exposed sections. Keep your cadence steady and your mind focused on smooth, efficient power delivery.",
        routeDetails: {
            start: "Coastal entry point",
            keyPoint: "Exposed and sheltered sections",
            difficulty: "Sustained power test",
            finish: "Big Loop completion"
        },
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTI0NjUsImFjY2Vzc0NvZGUiOjE4NjA2MCwicmVxdWlyZUFjY2Vzc0NvZGUiOnRydWUsInRpdGxlVGVtcGxhdGUiOiJCZWFjaCBhbmQgUGluZSBUVCAtIFRQViBDYXJlZXIgTW9kZSJ9"
    },
    11: {
        number: "11",
        name: "South Lake Points Race",
        subtitle: "Multi-lap tactical circuit race",
        type: "Points Race",
        level: "Local Amateur",
        mandatory: false,
        distance: "21.8 km",
        climbing: "119 m",
        course: "South Lake Loop Reverse",
        format: "8 laps",
        maxPoints: 60,
        icon: "🎯",
        description: `The South Lake Points Race is one of the most recognizable fixtures on the local calendar—a multi-lap event built around a classic loop that every rider in the region knows by heart.

Each lap features the course's signature elements: a short, punchy rise that tempts repeated attacks and a notoriously tight corner that demands full attention as the bunch funnels through.

With points awarded at regular sprint laps, the pace surges constantly, making the race a blend of timing, race sense, and controlled aggression. For newcomers and veterans alike, the South Lake Points Race remains a benchmark of local circuit racing.`,
        strategy: "Know when points are awarded and position yourself accordingly. Don't waste energy on non-points laps unless you need to establish position. The tight corner is critical—enter it in the top 10 or you'll lose contact. Target consistent placings rather than gambling everything on one big effort.",
        routeDetails: {
            start: "South Lake Loop",
            keyPoint: "Punchy climbs and tight corner",
            difficulty: "Tactical points racing",
            finish: "Most points after 8 laps"
        },
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTI0NjYsImFjY2Vzc0NvZGUiOjE4NjA2MCwicmVxdWlyZUFjY2Vzc0NvZGUiOnRydWUsInRpdGxlVGVtcGxhdGUiOiJTb3V0aCBMYWtlIFBvaW50cyBSYWNlIC0gVFBWIENhcmVlciBNb2RlIn0="
    },
    12: {
        number: "12",
        name: "Unbound - Little Egypt",
        subtitle: "Rugged gravel challenge",
        type: "Gravel",
        level: "Local Amateur",
        mandatory: false,
        distance: "38.0 km",
        climbing: "493 m",
        course: "Unbound Little Egypt",
        format: "Fondo-style",
        maxPoints: 145,
        icon: "🚵",
        description: `Unbound — Little Egypt sends riders into one of the most rugged and respected sections of the larger Unbound course, a hilly and technical stretch that demands sharp handling, constant focus, and a willingness to grind through whatever the terrain throws at you.

For this special Fondo-style edition, riders take on the Little Egypt segment as a standalone challenge—open to developing athletes who want to taste the atmosphere of a major event while still racing for position and pride.

For many newcomers, this race carries personal meaning. In your case, your family pooled together to cover the entry fee and travel, hoping to help you chase the cycling dream you've talked about for years. It turns the day into more than just a test of fitness: every rise you crest and every tricky corner you navigate is a reminder of the support behind you. Little Egypt doesn't give anything away easily, but for those who dig in and finish strong, it becomes an unforgettable milestone.`,
        strategy: "Gravel racing is about managing variables—rough surfaces, loose corners, and changing gradients. Stay loose on the bike, keep your weight balanced, and don't fight the terrain. Pace yourself on the climbs and ride within your limits on technical descents. This is about finishing strong, not starting fast.",
        routeDetails: {
            start: "Little Egypt section",
            keyPoint: "Technical gravel climbs",
            difficulty: "Rugged and demanding",
            finish: "Little Egypt endpoint"
        },
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTI0NTgsImFjY2Vzc0NvZGUiOjE4NjA2MCwicmVxdWlyZUFjY2Vzc0NvZGUiOnRydWUsInRpdGxlVGVtcGxhdGUiOiJVbmJvdW5kIExpdHRsZSBFZ3lwdCAtIFRQViBDYXJlZXIgTW9kZSJ9"
    },
    13: {
        number: "13",
        name: "Local Tour Stage 1",
        subtitle: "Figure of 8",
        type: "Stage Race - Stage 1",
        level: "Local Amateur",
        mandatory: true,
        distance: "35.2 km",
        climbing: "174 m",
        course: "Figure Of Eight",
        format: "1 stage",
        maxPoints: 120,
        icon: "🏆",
        description: `Stage 1 of the Local Tour sets the tone for the entire three-day race. The Figure of 8 course is a flowing opener that isn't overly difficult, but every second counts—positioning and time gaps earned here will matter for the overall GC.

This opening stage is about finding your rhythm and avoiding mistakes. It's not the hardest day, but it's crucial. Start conservatively, settle into the race, and finish with something left in the tank. The real battles are still to come, but a solid performance here puts you in the mix.

This is your first taste of multi-day stage racing. Focus on clean execution and smart positioning. Don't burn matches unnecessarily—you'll need them for the days ahead.`,
        strategy: "Stage racing is about consistency. Don't lose time unnecessarily. Stay near the front and avoid crashes. This isn't the day to win the tour, but it is a day you could lose it. Ride smart, stay safe, and set yourself up for the stages ahead.",
        routeDetails: {
            start: "Figure of 8 start",
            keyPoint: "Flowing roads with good positioning opportunities",
            difficulty: "Moderate opener",
            finish: "Figure of 8 finish"
        },
        isStageRace: true,
        tourStage: 1,
        tourEvent: "Local Tour",
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTI0OTcsImFjY2Vzc0NvZGUiOjE4NjA2MCwicmVxdWlyZUFjY2Vzc0NvZGUiOnRydWUsInRpdGxlVGVtcGxhdGUiOiJMb2NhbCBUb3VyIFN0YWdlIDEgLSBUUFYgQ2FyZWVyIE1vZGUifQ=="
    },
    14: {
        number: "14",
        name: "Local Tour Stage 2",
        subtitle: "Loop the Loop",
        type: "Stage Race - Stage 2",
        level: "Local Amateur",
        mandatory: true,
        distance: "27.3 km",
        climbing: "169 m",
        course: "Loop the Loop",
        format: "1 stage",
        maxPoints: 95,
        icon: "🏆",
        description: `Stage 2 of the Local Tour is shorter and punchier than the opening stage. The Loop the Loop course features technical sections and opportunities for aggressive racing.

This is where attacks happen. Riders looking to make up time from Stage 1 will be on the offensive, while race leaders must stay vigilant to protect their advantage.

Time bonuses are available for stage placings, and every second counts in the overall GC battle. Stay near the front and be ready to respond to moves.`,
        strategy: "Expect aggressive racing from the start. Cover any dangerous moves but don't waste energy chasing everything. Position yourself well for the finale - stage wins here can shift the GC significantly.",
        routeDetails: {
            start: "Loop the Loop start",
            keyPoint: "Technical sections with attack opportunities",
            difficulty: "Punchy and aggressive",
            finish: "Loop the Loop finish"
        },
        isStageRace: true,
        tourStage: 2,
        tourEvent: "Local Tour",
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTI0OTgsImFjY2Vzc0NvZGUiOjE4NjA2MCwicmVxdWlyZUFjY2Vzc0NvZGUiOnRydWUsInRpdGxlVGVtcGxhdGUiOiJMb2NhbCBUb3VyIFN0YWdlIDIgLSBUUFYgQ2FyZWVyIE1vZGUifQ=="
    },
    15: {
        number: "15",
        name: "Local Tour Stage 3",
        subtitle: "A Bit of Everything",
        type: "Stage Race - Stage 3",
        level: "Local Amateur",
        mandatory: true,
        distance: "28.1 km",
        climbing: "471 m",
        course: "A Bit Of Everything",
        format: "1 stage",
        maxPoints: 135,
        icon: "🏆",
        description: `The queen stage of the Local Tour. This is where the overall classification will be decided. With 471m of climbing on tired legs from the previous two days, only the strongest will survive.

This stage lives up to its name - you'll encounter everything: climbs, descents, flats, and technical sections. The significant elevation gain makes this the hardest stage of the tour.

If you're in GC contention, this is where you make your move. If you're behind, it's a chance to salvage a stage win and pride. Either way, you'll need to dig deep.`,
        strategy: "Pace yourself on the early climbs - it's a long day. If you're defending a GC position, stay with the main contenders. If attacking for the GC, wait for the final climbs. Save energy for when it matters most.",
        routeDetails: {
            start: "A Bit of Everything start",
            keyPoint: "Multiple climbs testing tired legs",
            difficulty: "Queen stage - significant climbing",
            finish: "A Bit of Everything finish"
        },
        isStageRace: true,
        tourStage: 3,
        tourEvent: "Local Tour",
        scheduleUrl: "https://tpvirtualhub.com/clone?o=eyJzY2hlZHVsZUtleSI6NTI0OTksImFjY2Vzc0NvZGUiOjE4NjA2MCwicmVxdWlyZUFjY2Vzc0NvZGUiOnRydWUsInRpdGxlVGVtcGxhdGUiOiJMb2NhbCBUb3VyIFN0YWdlIDMgLSBUUFYgQ2FyZWVyIE1vZGUifQ=="
    }
};

// Special Events Data - exclusive one-off events unlockable through the store
const specialEventData = {
    101: {
        id: 101,
        number: "SE01",
        name: "Singapore Criterium",
        subtitle: "Night race through the streets of Marina Bay",
        type: "Criterium",
        level: "Special Event",
        isSpecialEvent: true,
        unlockId: "singapore-criterium",
        distance: "TBD",
        climbing: "TBD",
        course: "TBD",
        format: "TBD",
        maxPoints: 100,
        icon: "🇸🇬",
        description: `The Singapore Criterium is an exclusive night race through the illuminated streets of Marina Bay. Reserved for riders who have proven their dedication to the sport, this prestigious event offers a unique racing experience under the city lights.

Racing under floodlights with the Singapore skyline as your backdrop, you'll navigate a technical circuit that demands both speed and precision. The humid tropical conditions add an extra layer of challenge to this already demanding event.

This is more than just a race—it's a statement. Being here means you've earned your place among the elite.`,
        strategy: "Night racing requires extra focus. The course will be well-lit but shadows can play tricks. Stay hydrated in the tropical heat and humidity. Technical corners are critical—smooth is fast. Position yourself well before key turns and be prepared for aggressive racing throughout.",
        routeDetails: {
            start: "Marina Bay Street Circuit",
            keyPoint: "Technical night circuit",
            difficulty: "High-speed technical racing",
            finish: "Marina Bay"
        },
        rewards: {
            careerPoints: 100,
            bonusCC: 50
        },
        scheduleUrl: null // To be set when event is configured
    }
};

// Function to get event by ID (includes both regular and special events)
function getEvent(id) {
    return eventData[id] || specialEventData[id] || null;
}

// Function to get special event by ID
function getSpecialEvent(id) {
    return specialEventData[id] || null;
}

// Function to calculate points distribution
function calculatePoints(maxPoints) {
    // Match the actual point calculation formula from process-results.js
    // Formula: points = (maxPoints/2) + (40 - position) * ((maxPoints - 10)/78) + podiumBonus
    // Podium bonuses: 1st = +5, 2nd = +3, 3rd = +2
    // Only positions 1-40 score points
    
    const positions = [];
    
    for (let position = 1; position <= 10; position++) {
        if (position <= 40) {
            // Calculate base points
            const basePoints = (maxPoints / 2) + (40 - position) * ((maxPoints - 10) / 78);
            
            // Calculate podium bonus
            let podiumBonus = 0;
            if (position === 1) podiumBonus = 5;
            else if (position === 2) podiumBonus = 3;
            else if (position === 3) podiumBonus = 2;
            
            // Total points (rounded to nearest integer)
            const points = Math.round(basePoints + podiumBonus);
            
            // Format rank
            const suffix = position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th';
            
            positions.push({
                rank: `${position}${suffix}`,
                points: points
            });
        } else {
            positions.push({
                rank: `${position}th`,
                points: 0
            });
        }
    }
    
    // Add ranges for other positions
    positions.push({
        rank: '11th-20th',
        points: `${calculateSinglePosition(20, maxPoints)}-${calculateSinglePosition(11, maxPoints)}`
    });
    
    positions.push({
        rank: '21st-30th',
        points: `${calculateSinglePosition(30, maxPoints)}-${calculateSinglePosition(21, maxPoints)}`
    });
    
    positions.push({
        rank: '31st-40th',
        points: `${calculateSinglePosition(40, maxPoints)}-${calculateSinglePosition(31, maxPoints)}`
    });
    
    positions.push({
        rank: '41st+',
        points: 0
    });
    
    return positions;
}

// Helper function to calculate points for a single position
function calculateSinglePosition(position, maxPoints) {
    if (position > 40) return 0;
    
    const basePoints = (maxPoints / 2) + (40 - position) * ((maxPoints - 10) / 78);
    let podiumBonus = 0;
    if (position === 1) podiumBonus = 5;
    else if (position === 2) podiumBonus = 3;
    else if (position === 3) podiumBonus = 2;
    
    return Math.round(basePoints + podiumBonus);
}

// Export for use in HTML (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { eventData, specialEventData, getEvent, getSpecialEvent, calculatePoints, calculateSinglePosition };
}

// Also make available in browser via window object
if (typeof window !== 'undefined') {
    window.eventData = eventData;
    window.specialEventData = specialEventData;
    window.getEvent = getEvent;
    window.getSpecialEvent = getSpecialEvent;
    window.calculatePoints = calculatePoints;
    window.calculateSinglePosition = calculateSinglePosition;
}