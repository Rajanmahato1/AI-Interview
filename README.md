# 🚀 AI Interview Practice System (MERN Stack + Multi-Provider AI)

A production-ready full-stack AI Interview Practice platform built using the MERN stack with multi-provider AI resilience: **Google Gemini**, **Groq**, and **DeepSeek**.

---

## 🌟 Key Features

- **Multi-Provider AI Architecture**:
  - Primary provider: Google Gemini (`gemini-1.5-flash`)
  - Automatic fallback cascade: Groq (`llama3-8b-8192`) ➡️ DeepSeek (`deepseek-chat`)
  - Exponential backoff retry mechanism with timeout protection
- **Realistic Interview Simulator**:
  - Role-specific questions tailored to seniority, role, and industry
  - Adaptive difficulty levels and time constraints
  - Structured evaluation criteria: Relevance, Technical Depth, Communication & Problem-Solving
- **Instant AI Feedback & Score Breakdown**:
  - Granular feedback per question with suggestions for improvement and model answers
  - Radar chart analytics and overall performance breakdown
  - Comprehensive downloadable interview summary reports
- **User Dashboard & Analytics**:
  - Recent interview sessions, trends over time, and progress monitoring
  - Performance history with filtering and pagination
- **Authentication & Security**:
  - JWT-based authentication with bcrypt password hashing
  - Secure HTTP headers (Helmet), Rate limiting, and CORS protection
  - Input validation with Zod on both client and server

---

## 🏗️ Architecture Overview

```
AI Interview Practice System/
├── Backend/
│   ├── src/
│   │   ├── controllers/      # Auth, Interviews, Reports, Profile, Dashboard
│   │   ├── middleware/       # JWT Auth verification, Error Handling
│   │   ├── models/           # User, InterviewSession, Question, Answer, Report
│   │   ├── routes/           # REST endpoints
│   │   ├── services/ai/      # Gemini, Groq, DeepSeek providers & Fallback Manager
│   │   ├── app.js            # Express app configuration
│   │   ├── config.js         # Environment & AI settings
│   │   └── server.js         # Server bootstrap & MongoDB connection
│   ├── .env.example
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── api/              # Axios client & API helpers
│   │   ├── context/          # AuthContext
│   │   ├── pages/            # Landing, Login, Register, Dashboard, Setup,
│   │   │                     # ActiveInterview, History, Report, Profile
│   │   ├── routes/           # Protected & Guest route wrappers
│   │   ├── App.jsx           # Application routing
│   │   ├── main.jsx          # Entry point
│   │   └── index.css         # Custom modern design system
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## ⚙️ Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** running locally (`mongodb://localhost:27017`) or a MongoDB Atlas URI
- API Key(s) for at least one AI provider (Gemini, Groq, or DeepSeek)

### 2. Configure Backend Environment
Create a `.env` file in `Backend/` (or edit the created one):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-interview-practice
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
CLIENT_URL=http://localhost:5173

# AI Providers
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama3-8b-8192

DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-chat

AI_PRIMARY_PROVIDER=gemini
AI_FALLBACK_PROVIDERS=groq,deepseek
```

### 3. Run the Backend
```bash
cd Backend
npm install
npm run dev   # Starts on http://localhost:5000
```

### 4. Run the Frontend
```bash
cd Frontend
npm install
npm run dev   # Starts on http://localhost:5173
```

Visit [http://localhost:5173](http://localhost:5173) in your browser!
