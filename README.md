# Agents in the Wild

<p align="center">
  <img src="generated-icon.png" alt="Agents in the Wild Logo" width="200"/>
</p>

<h2 align="center">Agents in the Wild</h2>

<p align="center">
  <a href="#features">🤖 Features</a> | 
  <a href="#installation">📦 Installation</a> | 
  <a href="#getting-started">🚀 Getting Started</a> | 
  <a href="#api-integration">🔌 API Integration</a> | 
  <a href="#database-setup">💾 Database</a> | 
  <a href="#authentication">🔐 Authentication</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue" alt="React 18"/>
  <img src="https://img.shields.io/badge/Express-4-green" alt="Express 4"/>
  <img src="https://img.shields.io/badge/PostgreSQL-15-blue" alt="PostgreSQL 15"/>
  <img src="https://img.shields.io/badge/Apify-SDK-orange" alt="Apify SDK"/>
  <img src="https://img.shields.io/badge/license-MIT-lightgrey" alt="License"/>
</p>

Agents in the Wild is a cutting-edge platform for data retrieval and dynamic agent configuration, with advanced API integration capabilities. This platform connects you with intelligent agents ready to perform tasks and generate value independently.

## Features

- **🤖 Agent Marketplace**: Browse, create, and manage AI agents for various tasks
- **📊 Data Scraping**: Advanced web data extraction and scraping capabilities
- **💵 Wallet System**: Comprehensive payment and credits management
- **🔍 Real-time API Exploration**: Test and configure API endpoints directly in the interface
- **📱 Responsive UI**: Modern interface built with shadcn/UI and Tailwind CSS
- **🔒 Authentication**: Secure user authentication and session management
- **💾 PostgreSQL Database**: Persistent data storage with Drizzle ORM

## Installation

### Prerequisites

- Node.js >= 16
- PostgreSQL >= 15
- Git

### Local Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/agents-in-the-wild.git
cd agents-in-the-wild
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory with the following variables:

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/agents_db

# Server
PORT=5000

# Session
SESSION_SECRET=your_session_secret

# Optional: Apify API Token (needed for live data)
APIFY_API_TOKEN=your_apify_token
```

## Database Setup

1. **Create PostgreSQL database**

```bash
createdb agents_db
```

2. **Push schema to database**

```bash
npm run db:push
```

This will create all necessary tables using Drizzle ORM migrations.

## Getting Started

1. **Start the development server**

```bash
npm run dev
```

This will start both the Express backend server and the React frontend development server.

2. **Access the application**

Open your browser and navigate to:
```
http://localhost:5000
```

## Project Structure

```
agents-in-the-wild/
├── client/                # Frontend code (React)
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and helpers
│   │   ├── pages/         # Page components
│   │   └── main.tsx       # Main entry point
├── server/                # Backend code (Express)
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Data storage interface
│   ├── auth.ts            # Authentication logic
│   ├── db.ts              # Database connection
│   └── index.ts           # Server entry point
├── shared/                # Shared code
│   └── schema.ts          # Database schema
└── package.json           # Project dependencies
```

## API Integration

### Using the Apify Integration

The application has built-in integration with the Apify platform, which is used to fetch and process data from various sources across the web.

1. **Obtain an Apify API token**

Sign up at [Apify](https://apify.com) and get your API token from your account settings.

2. **Configure the token**

Add your Apify API token to the `.env` file:

```
APIFY_API_TOKEN=your_apify_token
```

3. **Create an Agent**

Navigate to the "Create Agent" page in the application and:
- Enter agent name and description
- Select a data source
- Configure data scraping parameters
- Set pricing and other details

## Authentication

The application uses a secure authentication system with password hashing and session management:

1. **Register a new account**
   - Navigate to `/auth` and use the registration form
   - Username and password are required

2. **Login to existing account**
   - Use the login form with your credentials
   - Sessions are persistent and stored in the database

3. **Protected routes**
   - Certain routes require authentication
   - The system uses Passport.js for authentication management

## Development Commands

```bash
# Start development server
npm run dev

# Push database schema changes
npm run db:push

# Build for production
npm run build

# Start production server
npm run start
```

## Deployment

For deploying to Replit:

1. Clone the repository to your Replit project
2. Install dependencies using `npm install`
3. Set up environment variables in the Replit Secrets panel
4. Deploy using Replit's deployment features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Apify](https://apify.com) - Web scraping and automation platform
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [Replit](https://replit.com) - Development and hosting platform
