# Heppi 🎄

A mobile-friendly Christmas-themed blog web application built with React, Tailwind CSS, and Supabase authentication.

## Features

- 🎄 Rotating 3D Christmas tree with animated lights
- 📱 Mobile-optimized for iPhone and other mobile devices
- 🔐 Supabase authentication (optional - works without it)
- 🐳 Docker containerization support
- ☁️ Terraform configuration for AWS EC2 (free tier)
- ⚛️ React + Vite for fast development
- 🎨 Tailwind CSS for modern styling

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **Authentication**: Supabase (optional)
- **Infrastructure**: Terraform, AWS EC2
- **Containerization**: Docker

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
cp .env.example .env
# Edit .env and add your Supabase credentials if you want authentication
```

3. **Start the development server:**
```bash
npm run dev
```

This will start Vite dev server on `http://localhost:5173` with hot reload.

4. **For production build:**
```bash
# Build the React app
npm run build

# Start the Express server
npm start
```

The app will be available at `http://localhost:3000`.

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

## Docker

### Build the Docker image:
```bash
docker build -t heppi .
```

### Run the container:
```bash
docker run -p 3000:3000 heppi
```

Then visit `http://localhost:3000` in your browser.

### With environment variables:
```bash
docker run -p 3000:3000 \
  -e VITE_SUPABASE_URL=your_url \
  -e VITE_SUPABASE_ANON_KEY=your_key \
  heppi
```

## AWS Deployment (Free Tier)

### Prerequisites

1. AWS account with free tier eligibility
2. AWS CLI configured
3. Terraform installed (>= 1.0)
4. EC2 Key Pair created

### Quick Start

1. **Create an EC2 Key Pair:**
```bash
aws ec2 create-key-pair --key-name heppi-key --query 'KeyMaterial' --output text > heppi-key.pem
chmod 400 heppi-key.pem
```

2. **Configure Terraform:**
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

3. **Deploy:**
```bash
terraform init
terraform plan
terraform apply
```

4. **Deploy the application:**
   - SSH into the instance using the output from Terraform
   - Clone your repo or copy files
   - Build and run with Docker

See `terraform/README.md` for detailed instructions.

### Cost

- **EC2 t2.micro**: Free for 12 months (750 hours/month)
- **Data transfer**: First 1 GB/month free
- **Storage**: 30 GB free (EBS)

**Estimated cost: $0/month** (within free tier limits)

## Project Structure

```
heppi/
├── src/
│   ├── components/        # React components
│   │   ├── Login.jsx     # Login page
│   │   ├── Home.jsx      # Home page
│   │   └── ChristmasTree.jsx  # Christmas tree component
│   ├── App.jsx           # Main app component
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles + Tailwind
├── public/              # Static assets
├── terraform/           # Terraform configuration
│   ├── main.tf         # Main Terraform config
│   └── variables.tf    # Variables
├── server.js            # Express server
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
├── Dockerfile           # Docker configuration
└── package.json         # Dependencies
```

## Scripts

- `npm run dev` - Start Vite dev server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm start` - Start Express server (port 3000)

## Mobile Optimization

The application is optimized for mobile devices with:
- Responsive viewport settings
- Touch-friendly interface
- Optimized animations for mobile performance
- Apple mobile web app support
- Tailwind CSS responsive utilities

## Future Features

- Blog post creation and management
- Rich text editor
- Image uploads
- Categories and tags
- Search functionality

## License

ISC
