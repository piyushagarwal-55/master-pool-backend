# Backend README

## 🚀 Backend Setup

### Prerequisites
- Node.js 18+
- MongoDB
- npm or yarn

### Installation
```bash
npm install
```

### Environment Setup
```bash
cp .env.example .env
```

Update `.env` with your values:
```
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/carpooling
JWT_SECRET=your-super-secret-jwt-key
```

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 🌍 Deployment (Render)

1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `CORS_ORIGIN=https://your-frontend-domain.vercel.app`

## 📁 Project Structure

```
backend/
├── models/          # MongoDB models
├── routes/          # API routes
├── middleware/      # Custom middleware
├── services/        # Business logic
├── server.js        # Main server file
└── package.json
```

## 🔧 API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/trips` - Get all trips
- `POST /api/trips` - Create trip
- `POST /api/trips/:id/join` - Join trip
- `GET /api/notifications` - Get notifications
- `GET /api/messages/trip/:id` - Get trip messages
- `POST /api/messages` - Send message
