# The Spinner

A wheel spinner app for randomly selecting people. Add your friends, spin the wheel, and the winner is chosen by fate.

## Features

- Add/remove people with custom colors
- Track frequency of wins
- Spin with double-click or SPIN button
- Cloud sharing via JSONBin.io - share the same wheel with friends
- Real-time updates when using shared links
- Responsive design with particle effects

## Setup

1. Download [Node.js](https://nodejs.org/en/download/).
2. Run the following commands:

```bash
# Install dependencies
npm install

# Run local server (http://localhost:5173)
npm run dev

# Build for production (dist/ directory)
npm run build
```

## Usage

### Add People
- Type a name in the input field
- Select a color (or use the auto-selected one)
- Click ADD or press Enter

### Spin the Wheel
- Click SPIN button
- Or double-click anywhere on the page

### Remove People
- Click the ✕ button next to a person

### Toggle Availability
- Click on a person to mark them as unavailable (they won't be selected)
- Click again to make them available

## Cloud Sharing

Share your wheel with friends so everyone sees the same data in real-time.

### Create a Shareable Link
1. Add your people to the wheel
2. Click the **SHARE** button
3. A unique URL is copied to your clipboard
4. Share the URL with friends

### Open a Shared Wheel
Simply open the shared URL. The app will automatically load the wheel data from the cloud.

### How it Works
- Uses [JSONBin.io](https://jsonbin.io) for cloud storage
- Each wheel has a unique bin ID in the URL (`?bin=XXX`)
- Changes sync automatically to the cloud
- Works on any device with a modern browser

## Technologies

- [Three.js](https://threejs.org/) - 3D rendering and shaders
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [JSONBin.io](https://jsonbin.io/) - Cloud data storage

## Project Structure

```
src/
├── index.html      # Main HTML with UI
├── script.js       # Three.js and wheel logic
├── style.css       # Custom styles
└── shaders/         # GLSL shaders for particles
    ├── particles/
    │   ├── vertex.glsl
    │   └── fragment.glsl
    └── mercedes/
        ├── vertex.glsl
        └── fragment.glsl
```

## Deployment

To deploy to GitHub Pages:

```bash
# Build the app
npm run build

# Deploy
npm run deploy
```

Your app will be available at `https://<username>.github.io/<repo-name>/`

## License

MIT