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
        }
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
        }
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
        }
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
        }
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
        }
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
        description: `The Easy Hill Climb TT is a straightforward test of pacing on a two-part course: a fast, flat opening section followed by a steady 3–4% climb to the line.

With no technical features and no sharp gradients, the challenge is entirely in how evenly you can meter your effort. Riders who go too hard early pay for it the moment the road tilts upward, while those who hold back too much lose free speed on the flats.

It's a clean, controlled time trial that rewards discipline over explosiveness—an ideal early-season benchmark for riders learning to balance tempo and threshold on mixed terrain.`,
        strategy: "Ride the flat section at a controlled tempo—resist the urge to go too hard. As you hit the climb, settle into a sustainable rhythm you can hold to the top. Focus on smooth pedaling and steady breathing. The climb isn't steep enough to stand, so stay seated and grind it out.",
        routeDetails: {
            start: "Flat approach road",
            keyPoint: "Transition to 3-4% climb",
            difficulty: "Pacing discipline required",
            finish: "Top of steady climb"
        }
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
        }
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
        }
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
        }
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
        }
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
        }
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
        description: `Unbound – Little Egypt sends riders into one of the most rugged and respected sections of the larger Unbound course, a hilly and technical stretch that demands sharp handling, constant focus, and a willingness to grind through whatever the terrain throws at you.

For this special Fondo-style edition, riders take on the Little Egypt segment as a standalone challenge—open to developing athletes who want to taste the atmosphere of a major event while still racing for position and pride.

For many newcomers, this race carries personal meaning. In your case, your family pooled together to cover the entry fee and travel, hoping to help you chase the cycling dream you've talked about for years. It turns the day into more than just a test of fitness: every rise you crest and every tricky corner you navigate is a reminder of the support behind you. Little Egypt doesn't give anything away easily, but for those who dig in and finish strong, it becomes an unforgettable milestone.`,
        strategy: "Gravel racing is about managing variables—rough surfaces, loose corners, and changing gradients. Stay loose on the bike, keep your weight balanced, and don't fight the terrain. Pace yourself on the climbs and ride within your limits on technical descents. This is about finishing strong, not starting fast.",
        routeDetails: {
            start: "Little Egypt section",
            keyPoint: "Technical gravel climbs",
            difficulty: "Rugged and demanding",
            finish: "Little Egypt endpoint"
        }
    },
    13: {
        number: "13-15",
        name: "Local Tour",
        subtitle: "Three-stage race testing consistency and tactics",
        type: "Stage Race",
        level: "Local Amateur",
        mandatory: true,
        distance: "90.6 km (total)",
        climbing: "814 m (total)",
        course: "Various stages",
        format: "3 stages",
        maxPoints: 350,
        icon: "🏆",
        description: `The Local Tour is a three-day stage race that tests everything: endurance, tactics, consistency, and mental fortitude. Each stage presents unique challenges, and overall success requires performing well across all disciplines.

**Stage 1: Figure of Eight** (35.2km, 174m climbing, 120 points)
A flowing stage that sets the tone for the tour. Not overly difficult, but positioning and time gaps earned here matter.

**Stage 2: Loop the Loop** (27.3km, 169m climbing, 95 points)
Shorter and punchier. Expect aggressive racing and opportunities for time bonuses. Stay alert.

**Stage 3: A Bit of Everything** (28.1km, 471m climbing, 135 points)
The queen stage. Significant climbing tests tired legs. The GC battle is often decided here, with attackers looking to overturn gaps from earlier stages.

This is where you learn what it takes to race over multiple days—managing fatigue, maintaining focus, and adapting to different race situations. It's the crown jewel of the local calendar.`,
        strategy: "Stage racing is about consistency. Don't lose time unnecessarily on Stage 1. Stay near the front and avoid crashes. Stage 2 is where attacks happen—cover moves and don't give away time. Stage 3 is the decider: if you're in contention, be ready to dig deep on the climbs. If not, focus on a strong stage result.",
        routeDetails: {
            stage1: "Figure of Eight - 35.2km, 174m",
            stage2: "Loop the Loop - 27.3km, 169m",
            stage3: "A Bit of Everything - 28.1km, 471m",
            difficulty: "Multi-day endurance and tactics"
        },
        isStageRace: true,
        stages: [
            {
                name: "Stage 1: Figure of Eight",
                distance: "35.2 km",
                climbing: "174 m",
                points: 120,
                description: "A flowing opener that sets the tone for the tour."
            },
            {
                name: "Stage 2: Loop the Loop",
                distance: "27.3 km",
                climbing: "169 m",
                points: 95,
                description: "Shorter and punchier with aggressive racing expected."
            },
            {
                name: "Stage 3: A Bit of Everything",
                distance: "28.1 km",
                climbing: "471 m",
                points: 135,
                description: "The queen stage with significant climbing to decide the GC."
            }
        ]
    }
};

// Function to get event by ID
function getEvent(id) {
    return eventData[id] || null;
}

// Function to calculate points distribution
function calculatePoints(maxPoints) {
    const positions = [
        { rank: "1st", percentage: 100 },
        { rank: "2nd", percentage: 96.5 },
        { rank: "3rd", percentage: 94 },
        { rank: "4th", percentage: 91 },
        { rank: "5th", percentage: 89.5 },
        { rank: "6th", percentage: 88.5 },
        { rank: "7th", percentage: 87 },
        { rank: "8th", percentage: 86 },
        { rank: "9th", percentage: 85 },
        { rank: "10th", percentage: 84 }
    ];

    return positions.map(pos => ({
        rank: pos.rank,
        points: Math.round(maxPoints * (pos.percentage / 100))
    }));
}

// Export for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { eventData, getEvent, calculatePoints };
}
