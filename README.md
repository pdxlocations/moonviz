# MoonViz

MoonViz is a local web app for visualizing the Earth, Sun, and Moon for a selected date, time, and observer location. It runs entirely from this folder in a browser.
<img width="1489" height="849" alt="image" src="https://github.com/user-attachments/assets/d22ac30d-210c-4d70-a8fe-f78d29ed324d" />

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

## Docker

Run MoonViz with Docker Compose:

```sh
docker compose up --build
```

Then open:

```text
http://localhost:8123/
```

If you are connecting from another device on the same network, replace `localhost` with the Linux box's IP address.

You can also build and run MoonViz with plain Docker:

```sh
docker build -t moonviz .
docker run --rm -p 8123:8123 moonviz
```

Then open:

```text
http://localhost:8123/
```

To use a different host port, change the value before the colon:

```sh
docker run --rm -p 8124:8123 moonviz
```

Then open `http://localhost:8124/`.

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

## Network Access

To open MoonViz from another computer, tablet, or phone on the same network, run:

```sh
npm run serve:lan
```

The server prints one or more network URLs, for example:

```text
http://192.168.1.42:8123/
```

Open that URL from another device on the same Wi-Fi or LAN.

Your operating system firewall may ask whether Node.js can accept incoming network connections. Allow it for private/trusted networks if you want other devices to connect.

Use LAN mode only on networks you trust.

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
