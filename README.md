# Attendance Management System

A comprehensive web-based attendance management system built with Node.js, Express, SQLite, and vanilla JavaScript.

## Features

### 🔐 Authentication
- User registration and login
- Secure password hashing with bcrypt
- JWT token-based authentication
- Session persistence

### 📊 Dashboard
- Real-time attendance status
- Check-in/Check-out functionality
- Today's attendance summary
- Hours worked calculation
- Attendance history with filtering

### 👥 Admin Panel
- User management
- View all attendance records
- Admin-only access controls

### 📱 Responsive Design
- Mobile-friendly interface
- Modern UI with smooth animations
- Toast notifications
- Loading indicators

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

3. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`

## Default Admin Account

- **Username:** admin
- **Email:** admin@example.com
- **Password:** admin123

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile

### Attendance
- `POST /api/attendance/check-in` - Check in
- `POST /api/attendance/check-out` - Check out
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/history` - Get attendance history

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/attendance` - Get all attendance records

## Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - Unique email
- `password` - Hashed password
- `role` - User role (user/admin)
- `created_at` - Creation timestamp

### Attendance Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `date` - Attendance date
- `check_in` - Check-in time
- `check_out` - Check-out time
- `status` - Attendance status
- `notes` - Additional notes
- `created_at` - Creation timestamp

## Usage

1. **Register a new account** or use the default admin account
2. **Login** to access the dashboard
3. **Check in** when you start your day
4. **Check out** when you finish
5. **View your attendance history** and track your hours
6. **Admin users** can view all users and attendance records

## Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** SQLite3
- **Authentication:** JWT, bcryptjs
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Styling:** Custom CSS with modern design patterns
- **Icons:** Font Awesome

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation
- SQL injection prevention
- CORS protection

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development

To run in development mode with auto-restart:

```bash
npm run dev
```
