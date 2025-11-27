#!/usr/bin/env python3
"""
TPV Career Mode - Dummy Results Generator

Generate test race results for different scenarios.
Usage:
    python generate_results.py --event 2 --position 1 --riders 50
    python generate_results.py --event 3 --position last --riders 30
"""

import csv
import random
import argparse
from pathlib import Path

# Sample rider names for generating dummy data
FIRST_NAMES = [
    "James", "Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley",
    "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason",
    "Isabella", "William", "Mia", "Lucas", "Charlotte", "Benjamin", "Amelia",
    "Henry", "Harper", "Michael", "Evelyn", "Daniel", "Abigail", "Matthew"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas",
    "Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris",
    "Clark", "Lewis", "Robinson", "Walker", "Young", "Allen", "King"
]

def generate_rider_name():
    """Generate a random rider name."""
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def generate_arr(base_arr=800):
    """Generate a random ARR around a base value."""
    return base_arr + random.randint(-200, 200)

def generate_time(base_time, position, total_riders):
    """Generate a finish time based on position.
    
    Args:
        base_time: Base time in seconds for the winner
        position: Finishing position (1-indexed)
        total_riders: Total number of riders
    
    Returns:
        Finish time in seconds
    """
    if position == 1:
        return base_time
    
    # Add time based on position
    # Winner = base_time
    # Each position adds 1-3 seconds on average, with some randomness
    time_gap = (position - 1) * random.uniform(1.5, 3.5)
    
    # Last place gets a bigger gap
    if position == total_riders and total_riders > 10:
        time_gap += random.uniform(30, 60)
    
    return base_time + time_gap

def generate_results(event_num, user_position, num_riders=50, user_name="James Wilson", 
                    user_uid="test_user_123", user_tpv_uid="212354980F57BA1B", base_time=1800):
    """Generate race results CSV.
    
    Args:
        event_num: Event number (1-9)
        user_position: User's finishing position (1-indexed, or 'last' for last place)
        num_riders: Total number of riders
        user_name: User's name
        user_uid: User's Firebase UID
        user_tpv_uid: User's TPV UID
        base_time: Base winning time in seconds (default 30 minutes)
    
    Returns:
        List of result dictionaries
    """
    # Convert 'last' to actual position
    if user_position == 'last':
        user_position = num_riders
    
    results = []
    
    # Calculate distance (roughly 40km for a typical race)
    race_distance = base_time * 11.0  # ~11 m/s average = ~40km for 1800s
    
    # EventKey (using event number as simple key)
    event_key = f"8886{event_num}"
    
    # Generate all riders
    for position in range(1, num_riders + 1):
        is_user = (position == user_position)
        
        if is_user:
            name = user_name
            uid = user_tpv_uid
            gender = "Male"
            age_band = "40-44"
            ngb = "British Cycling"
            ngb_id = "1652049"
            uci_id = "10116817585"
        else:
            name = generate_rider_name()
            # Ensure unique names
            while any(r.get('Name') == name for r in results):
                name = generate_rider_name()
            uid = f"Bot{random.randint(100, 9999)}"
            gender = "Bot"
            age_band = ""
            ngb = ""
            ngb_id = ""
            uci_id = ""
        
        # Generate time
        finish_time = generate_time(base_time, position, num_riders)
        delta_time = finish_time - base_time if position > 1 else 0
        
        # Generate ARR (better riders = higher ARR)
        if position <= 10:
            arr = generate_arr(1100)
        elif position <= 25:
            arr = generate_arr(1000)
        elif position <= 40:
            arr = generate_arr(900)
        else:
            arr = generate_arr(700)
        
        # Generate EventRating with variation to create over/underperformers
        # EventRating determines predicted position (higher = better predicted position)
        # Add random variation so some riders beat/miss their predictions
        event_rating_variation = random.randint(-150, 150)
        event_rating = max(300, arr + event_rating_variation)  # Keep minimum of 300
        
        # Generate ARR Band
        arr_band = get_arr_band(arr)
        event_rating_band = get_arr_band(event_rating)
        
        # Team assignment (30% have teams)
        if random.random() < 0.3:
            team = random.choice(['Formix', 'Chaos', 'Patriot', 'Fujikai', 'Monova', 
                                 'Optech', 'Windsail', 'Zonkify', 'Hinal', 'Delta', 
                                 'Base', 'Ampex', 'Eckleson', 'Douvan', 'Fable'])
        else:
            team = ""
        
        # Country codes
        countries = ['GBR', 'USA', 'FRA', 'GER', 'ESP', 'ITA', 'NED', 'BEL', 'AUS', 
                    'CAN', 'NZL', 'IRL', 'SCO', 'ENG', 'WLS', 'JPN', 'BRA', 'MEX']
        country = 'GBR' if is_user else random.choice(countries)
        
        result = {
            'EventKey': event_key,
            'Pen': '2',
            'Position': str(position),
            'Name': name,
            'Team': team,
            'Country': country,
            'Time': f"{finish_time:.3f}",
            'DeltaTime': f"{delta_time:.3f}" if position > 1 else "0",
            'Distance': f"{race_distance:.3f}",
            'DeltaDistance': '0',
            'Points': '0',
            'Gender': gender,
            'UID': uid,
            'ARR': str(arr),
            'ARRBand': arr_band,
            'EventRating': str(event_rating),
            'EventRatingBand': event_rating_band,
            'AgeBand': age_band,
            'NGB': ngb,
            'NGB ID': ngb_id,
            'UCI ID': uci_id
        }
        
        results.append(result)
    
    return results

def get_arr_band(arr):
    """Get ARR band label matching TPV format."""
    if arr >= 1900: return 'Diamond 5'
    if arr >= 1800: return 'Diamond 4'
    if arr >= 1700: return 'Diamond 3'
    if arr >= 1600: return 'Diamond 2'
    if arr >= 1500: return 'Diamond 1'
    if arr >= 1400: return 'Platinum 3'
    if arr >= 1300: return 'Platinum 2'
    if arr >= 1200: return 'Platinum 1'
    if arr >= 1100: return 'Gold 3'
    if arr >= 1000: return 'Gold 2'
    if arr >= 900: return 'Gold 1'
    if arr >= 800: return 'Silver 3'
    if arr >= 700: return 'Silver 2'
    if arr >= 600: return 'Silver 1'
    if arr >= 500: return 'Bronze 3'
    if arr >= 400: return 'Bronze 2'
    if arr >= 300: return 'Bronze 1'
    return 'Unranked'

def save_results_csv(results, event_num, season=1):
    """Save results to CSV file in the proper directory structure.
    
    Args:
        results: List of result dictionaries
        event_num: Event number
        season: Season number (default 1)
    """
    # Create directory structure
    output_dir = Path(f"race_results/season_{season}/event_{event_num}")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate filename (matching TPV format)
    filename = output_dir / f"TPVirtual-Results-Event8886{event_num}-Pen2.csv"
    
    # Write CSV with TPV format
    with open(filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
        # Write header line
        csvfile.write('OVERALL INDIVIDUAL RESULTS:\n')
        csvfile.write('\n')
        
        # Column headers
        fieldnames = ['EventKey', 'Pen', 'Position', 'Name', 'Team', 'Country', 
                     'Time', 'DeltaTime', 'Distance', 'DeltaDistance', 'Points', 
                     'Gender', 'UID', 'ARR', 'ARRBand', 'EventRating', 
                     'EventRatingBand', 'AgeBand', 'NGB', 'NGB ID', 'UCI ID']
        
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"✅ Results saved to: {filename}")
    print(f"   Total riders: {len(results)}")
    
    # Find and print user's result
    user_result = next((r for r in results if r['UID'] == "212354980F57BA1B"), None)
    if user_result:
        print(f"   Your result: Position {user_result['Position']} | Time {user_result['Time']}s | ARR {user_result['ARR']} ({user_result['ARRBand']})")
    
    return filename

def main():
    parser = argparse.ArgumentParser(description='Generate dummy race results for TPV Career Mode')
    parser.add_argument('--event', type=int, required=True, help='Event number (1-9)')
    parser.add_argument('--position', required=True, help='Your finishing position (1-N or "last")')
    parser.add_argument('--riders', type=int, default=50, help='Total number of riders (default: 50)')
    parser.add_argument('--name', type=str, default='James Wilson', help='Your rider name')
    parser.add_argument('--uid', type=str, default='test_user_123', help='Your Firebase UID')
    parser.add_argument('--tpv-uid', type=str, default='212354980F57BA1B', help='Your TPV UID')
    parser.add_argument('--time', type=int, default=1800, help='Base winning time in seconds (default: 1800 = 30min)')
    parser.add_argument('--season', type=int, default=1, help='Season number (default: 1)')
    
    args = parser.parse_args()
    
    # Convert position to int if not 'last'
    if args.position.lower() == 'last':
        position = 'last'
    else:
        position = int(args.position)
        if position < 1 or position > args.riders:
            print(f"❌ Error: Position must be between 1 and {args.riders}")
            return
    
    print(f"\n🏁 Generating Race Results")
    print(f"   Event: {args.event}")
    print(f"   Position: {position}")
    print(f"   Total Riders: {args.riders}")
    print(f"   Rider: {args.name}")
    print()
    
    # Generate results
    results = generate_results(
        event_num=args.event,
        user_position=position,
        num_riders=args.riders,
        user_name=args.name,
        user_uid=args.uid,
        user_tpv_uid=args.tpv_uid,
        base_time=args.time
    )
    
    # Save to CSV
    save_results_csv(results, args.event, args.season)
    print()

if __name__ == '__main__':
    main()
