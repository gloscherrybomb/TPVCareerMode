# Achievement Notification Sound Files

This directory contains sound files for the achievement notification system.

## Required Files

You need to add the following 5 sound files:

1. **podium-chime.mp3** - Soft notification chime (~0.5s)
   - Used for: Podium finishes (gold, silver, bronze medals)
   - Style: Gentle, single chime sound

2. **special-chime.mp3** - Medium notification chime (~0.8s)
   - Used for: Special achievements (punching above, giant killer, bullseye, etc.)
   - Style: Medium intensity, double chime

3. **performance-fanfare.mp3** - Triumphant fanfare (~1.5s)
   - Used for: Performance awards (domination, close call, photo finish, etc.)
   - Style: Upbeat, celebratory

4. **victory-fanfare.mp3** - Victory fanfare (~2s)
   - Used for: GC/Tour classification awards
   - Style: Victorious, triumphant

5. **season-epic.mp3** - Epic orchestral hit (~3s)
   - Used for: Season completion awards (champion, perfect season, etc.)
   - Style: Epic, dramatic, orchestral

## Where to Find Sounds

### Free Resources (Recommended)

1. **Zapsplat** (https://www.zapsplat.com/)
   - Search for: "notification", "achievement", "success", "fanfare"
   - Free with attribution (check license)

2. **Freesound** (https://freesound.org/)
   - Search for: "UI notification", "success sound", "fanfare"
   - Creative Commons CC0 license available

3. **Mixkit** (https://mixkit.co/free-sound-effects/)
   - Free sound effects, no attribution required
   - Good for UI sounds

### AI-Generated (If needed)

- **ElevenLabs** - AI sound effect generation
- **Soundraw** - AI music/sound generation

### Manual Creation

You can also create simple notification sounds using:
- Audacity (free audio editor)
- GarageBand (Mac)
- FL Studio (Windows)

## File Format

- **Format**: MP3
- **Sample Rate**: 44.1 kHz or 48 kHz
- **Bitrate**: 128-192 kbps is sufficient
- **Channels**: Mono or Stereo

## Testing

After adding the sound files:

1. Open the browser console
2. Test sound playback:
   ```javascript
   window.achievementNotifications.soundManager.play('subtle');
   window.achievementNotifications.soundManager.play('moderate');
   window.achievementNotifications.soundManager.play('flashy');
   window.achievementNotifications.soundManager.play('ultraFlashy');
   ```

## Volume Control

Default volume is set to 0.5 (50%). Users' volume preferences are stored in localStorage as `tpv_sound_enabled` and `tpv_sound_volume`.

## Browser Autoplay Policy

Modern browsers block autoplay until user interaction. The system handles this by:
- Playing sounds only after user clicks/taps
- Gracefully handling autoplay failures
- Showing notifications without sound if autoplay is blocked

## Temporary Placeholder

For development/testing, you can use placeholder sounds or disable sound by setting:
```javascript
window.achievementNotifications.soundManager.mute();
```

The notification system will work perfectly without sounds - they're an enhancement, not a requirement.
