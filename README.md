# [DevExtreme](https://js.devexpress.com/) Ollama AI Chat Demo

This repo contains four small demo apps that all implement the same chat UI using DevExtreme’s Chat component and connect to an Ollama LLM instance via its streaming API. The four versions are:

- **Angular** (`angular/`)
- **jQuery** (`jquery/`)
- **React** (`react/`)
- **Vue 3** (`vue/`)

Each folder is a standalone project—pick your favorite framework!

---

## Prerequisites

- [Node.js (v16+)](https://nodejs.org/)  
- A running Ollama server accessible on your LAN (e.g. `http://YOUR_OLLAMA_HOST:11434/api/chat`)  
- A modern browser (Chrome, Firefox, Edge, Safari)

## Setup

1. Clone this repo
2. cd \<folder\>
3. npm install
4. Configure Ollama endpoint in code
5. Run app using appropriate script 