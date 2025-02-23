# Node Web Toolkit

A modern web application toolkit built with Node.js, React, and Express, featuring a comprehensive set of tools and utilities for building robust web applications.

## 🚀 Features

- **Full-Stack TypeScript** - End-to-end type safety with TypeScript
- **Modern Frontend** - React with Vite for fast development
- **Styling** - TailwindCSS with shadcn/ui components
- **Backend** - Express.js server with WebSocket support
- **Database** - Drizzle ORM with NeonDB support
- **Authentication** - Passport.js integration
- **API Integration** - OpenAI and Groq SDK support
- **Form Handling** - React Hook Form with Zod validation
- **Charts** - Recharts for data visualization
- **State Management** - React Query for server state
- **Routing** - Wouter for lightweight client-side routing

## 📦 Tech Stack

### Frontend
- React 18
- TailwindCSS
- shadcn/ui components
- Vite
- TypeScript
- React Query
- React Hook Form
- Recharts
- Framer Motion

### Backend
- Express.js
- WebSocket (ws)
- Passport.js
- DrizzleORM
- NeonDB
- TypeScript

## 🛠️ Setup

1. Clone the repository:
```bash
git clone https://github.com/OzlevyQ/ReqSenseAI.git
cd ReqSenseAI
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Start development server:
```bash
npm run dev
```

## 📄 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

## 🏗️ Project Structure

```
├── client/         # Frontend React application
├── server/         # Express backend
├── shared/         # Shared types and utilities
├── dist/          # Production build output
└── public/        # Static assets
```

## 🔧 Configuration

- `vite.config.ts` - Vite configuration
- `tailwind.config.ts` - TailwindCSS configuration
- `drizzle.config.ts` - Drizzle ORM configuration
- `tsconfig.json` - TypeScript configuration

## 📝 License

MIT