# Backend Manual Configuration Required

## 📋 What You Need to Change Manually

### 1. Environment Variables (.env file)
Create or update your `.env` file with:

```bash
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/carpooling
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
FRONTEND_URL=http://localhost:8080
```

**For Production:**
```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/carpooling
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### 2. MongoDB Setup

**Local Development:**
- Install MongoDB locally or use MongoDB Atlas
- Default connection: `mongodb://localhost:27017/carpooling`

**Production (MongoDB Atlas):**
1. Create account at mongodb.com/atlas
2. Create new cluster
3. Add database user with read/write permissions
4. Whitelist IP addresses (0.0.0.0/0 for all IPs)
5. Get connection string and update MONGODB_URI

### 3. JWT Secret
Generate a secure JWT secret (minimum 32 characters):
```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. CORS Configuration
Update FRONTEND_URL in .env to match your frontend domain:
- **Local**: `http://localhost:8080`
- **Production**: `https://your-frontend-domain.vercel.app`

## � Installation & Running

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm start
```

## 🔧 Features Implemented

- ✅ **WebSocket Chat** - Real-time group messaging
- ✅ **JWT Authentication** - Secure user sessions
- ✅ **Rate Limiting** - 1000 req/15min (dev), 100 req/15min (prod)
- ✅ **Notification System** - Join requests only (no chat notifications)
- ✅ **Group Chat API** - All participants can message
- ✅ **Security** - Helmet, CORS, input validation

## 📡 WebSocket Events

### Client to Server
- `join-trip` - Join a trip room for chat
- `leave-trip` - Leave a trip room

### Server to Client  
- `new-message` - Receive new chat messages in real-time

## �️ Security Features

- **Rate Limiting**: Protection against spam/abuse
- **JWT Tokens**: Secure authentication
- **Input Validation**: All API inputs validated
- **Helmet**: Security headers
- **CORS**: Controlled cross-origin access

## 📊 Database Models

### Message (Updated for Group Chat)
```javascript
{
  tripId: ObjectId,
  senderId: ObjectId,
  content: String,
  timestamp: Date
}
```

### Notification (Join Requests Only)
```javascript
{
  recipientId: ObjectId,
  senderId: ObjectId, 
  type: "join_request" | "join_approved" | "join_rejected",
  tripId: ObjectId,
  isRead: Boolean,
  actionRequired: Boolean
}
```

## 🔧 Production Deployment

### Render/Railway/Heroku
1. Connect GitHub repository
2. Set environment variables above
3. Deploy with `npm start`

### Environment Variables for Production
- `NODE_ENV=production`
- `MONGODB_URI=<your-mongodb-atlas-uri>`
- `JWT_SECRET=<your-32-char-secret>`
- `FRONTEND_URL=<your-frontend-domain>`
