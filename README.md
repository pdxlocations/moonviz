# MoonViz

MoonViz is a local web app for visualizing the Earth, Sun, and Moon for a selected date, time, and observer location. It runs entirely from this folder in a browser.

## Requirements

- Node.js 18 or newer
- npm, included with Node.js
- A modern browser

Install Node.js from <https://nodejs.org/> if `node --version` or `npm --version` is not available in your terminal.

## Setup

From a terminal in this project folder:

```sh
npm install
npm run serve
```

Then open:

```text
http://localhost:8123/
```

The same commands work on macOS Terminal, Windows PowerShell, Windows Terminal, and Linux terminals.

## Changing The Port

If port `8123` is already in use, start the server with a different port:

macOS/Linux:

```sh
PORT=8124 npm run serve
```

Windows PowerShell:

```powershell
$env:PORT=8124; npm run serve
```

Then open `http://localhost:8124/`.

## macOS Launcher

On macOS, `MoonViz.app` is an optional double-click launcher. It starts a local web server and opens MoonViz in the browser.

The terminal setup above is still the recommended cross-platform path, and it is the best way to verify dependencies after cloning the repo.

## Test

Run the astronomy/regression checks with:

```sh
npm test
```

## Controls

- Set the exact date and time with the date picker.
- Use `-1 day`, `+1 day`, `-1 hour`, `+1 hour`, and `Now` for quick jumps.
- Switch between Earth-, Sun-, and Moon-centered views.
- Use POV mode for observer, Sun, or Moon viewpoints.
- Drag the 3D view to rotate it in Space mode.
- Scroll over the view to zoom.
- Use the animation speed slider to move through time.

The astronomy math is a compact approximation suitable for visualization. It is not intended for navigation, occultation timing, or observatory-grade ephemerides.
