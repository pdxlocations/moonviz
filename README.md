# MoonViz

MoonViz is a local macOS-friendly app for viewing a 3D Earth-centered map of the sun and moon positions for past, present, or future dates.

## Run

Double-click `MoonViz.app` in Finder, or run:

```sh
npm run serve
```

Then open `http://localhost:8123`.

## Controls

- Set the exact date and time with the date picker.
- Use `-1 day`, `+1 day`, and `Now` for quick jumps.
- Drag the 3D view to rotate it.
- Scroll over the view to zoom.
- Use the animation speed slider to move through time.

The astronomy math is a compact approximation suitable for visualization. It is not intended for navigation, occultation timing, or observatory-grade ephemerides.
