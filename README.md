# Heppi 🎄

A mobile-friendly Christmas-themed web application with a rotating 3D Christmas tree and fireworks animation. Built with React, Vite, and Tailwind CSS, deployed on Vercel.

## Features

- 🎄 Rotating 3D Christmas tree with animated lights
- 🎆 Fireworks animation with "MERRY", "CHRISTMAS", and "I LOVE YOU" messages
- 📱 Mobile-optimized for iPhone and other mobile devices
- 🔐 Optional Supabase authentication
- ⚡ Fast development with Vite
- 🎨 Modern styling with Tailwind CSS
- ☁️ Deployed on Vercel with automatic HTTPS

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Authentication**: Supabase (optional)
- **Deployment**: Vercel
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)

### Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables (optional for Supabase):**
```bash
# Create .env file (optional - app works without Supabase)
# VITE_SUPABASE_URL=your_project_url
# VITE_SUPABASE_ANON_KEY=your_anon_key
```

3. **Start the development server:**
```bash
npm run dev
# or
make dev
```

This will start Vite dev server on `http://localhost:5173` with hot reload.

4. **Build for production:**
```bash
npm run build
# or
make build
```

The built files will be in the `dist/` directory.

5. **Preview production build:**
```bash
npm run preview
# or
make preview
```

## Supabase Setup (Optional)

The app works without Supabase, but if you want authentication:

1. Create a project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings > API
3. Create a user in Authentication > Users
4. Add credentials to `.env`:
   ```
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

## Deployment

This project is configured for deployment on **Vercel**. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deploy

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Vercel will auto-detect Vite and deploy automatically
4. Add your custom domain in Vercel settings

### Benefits of Vercel

- ✅ No server management
- ✅ Automatic HTTPS/SSL
- ✅ Global CDN (fast worldwide)
- ✅ Auto-deploy on every Git push
- ✅ Free tier sufficient for this project
- ✅ Much simpler than EC2/Docker setup

## Project Structure

```
heppi/
├── src/
│   ├── components/           # React components
│   │   ├── ChristmasTree.jsx # Rotating Christmas tree
│   │   ├── Fireworks.jsx     # Fireworks animation
│   │   ├── Home.jsx          # Home page
│   │   └── Login.jsx         # Login page (optional)
│   ├── App.jsx               # Main app component
│   ├── main.jsx              # React entry point
│   └── index.css             # Global styles + Tailwind
├── public/                   # Static assets
├── vercel.json              # Vercel configuration
├── vite.config.js           # Vite configuration
├── tailwind.config.js        # Tailwind configuration
└── package.json             # Dependencies
```

## Scripts

- `npm run dev` - Start Vite dev server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

Or use Make:
- `make dev` - Start development server
- `make build` - Build for production
- `make preview` - Preview production build
- `make install` - Install dependencies

## Mobile Optimization

The application is optimized for mobile devices with:
- Responsive viewport settings
- Touch-friendly interface
- Optimized animations for mobile performance
- Apple mobile web app support
- Tailwind CSS responsive utilities

## Legacy Infrastructure

The `terraform/` directory contains legacy AWS EC2 deployment configuration. This is no longer needed since we're using Vercel, but kept for reference. You can safely ignore or delete it.

## License

ISC
