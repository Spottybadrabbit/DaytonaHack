# Agent Marketplace World

An interactive Three.js prototype for the Wildlings agent marketplace. Founders explore a living 3D world, meet resident agents, and discover the Capital Houses representing aligned VCs and accelerators.

## Run locally

```bash
npm install
npm run dev
```

Open the displayed local URL. Arrow keys or WASD move through the meadow; click a resident or press Enter near one to inspect their public preview.

## Optional Meshy character generation

Copy `.env.example` to `.env.local` and add a Meshy API key. Run `npm run server` in a second terminal. The key is used only by `server.mjs`, never by browser code, and `.env.local` is gitignored.

Meshy generation incurs API credits, so create previews deliberately and refine only approved meshes.
