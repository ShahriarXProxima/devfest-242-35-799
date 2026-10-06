# AI Dev Fest Vibe Coding

A React + Vite application built for AI Dev Fest.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 8** — fast dev server & bundler
- **Tailwind CSS 4** — utility-first styling
- **Google Generative AI** (`@google/genai`)
- **pdf-lib** + **pdfjs-dist** — PDF processing
- **Express** — backend server

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ShahriarXProxima/devfest-242-35-799.git
   cd devfest-242-35-799
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables — create a `.env.local` file and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run TypeScript type check |
