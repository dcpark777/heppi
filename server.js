import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from dist directory (Vite build output)
app.use(express.static(path.join(__dirname, 'dist')));

// API routes can be added here
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Heppi server is running' });
});

// All other routes serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🎄 Heppi server is running on http://localhost:${PORT}`);
  console.log(`📱 Mobile-friendly Christmas blog is ready!`);
});

