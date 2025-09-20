const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Allow PDF, DOC, DOCX, TXT, and image files
    const allowedTypes = /pdf|doc|docx|txt|jpg|jpeg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, TXT, and image files are allowed!'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Initialize SQLite database
const db = new sqlite3.Database('attendance.db');

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'student',
    class_id INTEGER,
    first_name TEXT,
    last_name TEXT,
    student_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes (id)
  )`);

  // Attendance table
  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    check_in TIME,
    check_out TIME,
    status TEXT DEFAULT 'present',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Classes table
  db.run(`CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    teacher_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users (id)
  )`);

  // Study materials table
  db.run(`CREATE TABLE IF NOT EXISTS study_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT,
    file_type TEXT,
    class_id INTEGER,
    uploaded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes (id),
    FOREIGN KEY (uploaded_by) REFERENCES users (id)
  )`);

  // Notices table
  db.run(`CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    class_id INTEGER,
    created_by INTEGER,
    priority TEXT DEFAULT 'normal',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Events/Exams table
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT DEFAULT 'event',
    class_id INTEGER,
    event_date TEXT NOT NULL,
    event_time TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Student marks table
  db.run(`CREATE TABLE IF NOT EXISTS student_marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    exam_type TEXT NOT NULL,
    marks_obtained INTEGER NOT NULL,
    total_marks INTEGER NOT NULL,
    class_id INTEGER,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users (id),
    FOREIGN KEY (class_id) REFERENCES classes (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Create default data
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const teacherPassword = bcrypt.hashSync('teacher123', 10);
  const studentPassword = bcrypt.hashSync('student123', 10);
  
  // Create admin user
  db.run(`INSERT OR IGNORE INTO users (username, email, password, role, first_name, last_name) 
          VALUES ('admin', 'admin@example.com', ?, 'admin', 'Admin', 'User')`, [adminPassword]);
  
  // Create teacher user
  db.run(`INSERT OR IGNORE INTO users (username, email, password, role, first_name, last_name) 
          VALUES ('teacher', 'teacher@example.com', ?, 'teacher', 'John', 'Teacher')`, [teacherPassword]);
  
  // Create student user
  db.run(`INSERT OR IGNORE INTO users (username, email, password, role, first_name, last_name, student_id) 
          VALUES ('student', 'student@example.com', ?, 'student', 'Jane', 'Student', 'STU001')`, [studentPassword]);
  
  // Create default class
  db.run(`INSERT OR IGNORE INTO classes (name, description, teacher_id) 
          VALUES ('Class A', 'Default class for testing', 2)`);
  
  // Update student to be in the class
  db.run(`UPDATE users SET class_id = 1 WHERE id = 3`);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Register
app.post('/api/register', async (req, res) => {
  const { username, email, password, first_name, last_name, role, class_id } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (username, email, password, first_name, last_name, role, class_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, first_name || null, last_name || null, role || 'student', class_id || null],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        
        const token = jwt.sign(
          { id: this.lastID, username, email, role: role || 'student' },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        res.json({ 
          token, 
          user: { 
            id: this.lastID, 
            username, 
            email, 
            first_name: first_name || null,
            last_name: last_name || null,
            role: role || 'student'
          } 
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username, username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role 
        } 
      });
    }
  );
});

// Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Mark attendance
app.post('/api/attendance/check-in', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().split(' ')[0];

  // Check if already checked in today
  db.get(
    'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
    [req.user.id, today],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existing) {
        return res.status(400).json({ error: 'Already checked in today' });
      }

      // Insert check-in record
      db.run(
        'INSERT INTO attendance (user_id, date, check_in) VALUES (?, ?, ?)',
        [req.user.id, today, now],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ message: 'Check-in successful', attendanceId: this.lastID });
        }
      );
    }
  );
});

// Check out
app.post('/api/attendance/check-out', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().split(' ')[0];

  // Find today's attendance record
  db.get(
    'SELECT * FROM attendance WHERE user_id = ? AND date = ? AND check_out IS NULL',
    [req.user.id, today],
    (err, attendance) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!attendance) {
        return res.status(400).json({ error: 'No check-in found for today' });
      }

      // Update check-out time
      db.run(
        'UPDATE attendance SET check_out = ? WHERE id = ?',
        [now, attendance.id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ message: 'Check-out successful' });
        }
      );
    }
  );
});

// Get attendance history
app.get('/api/attendance/history', authenticateToken, (req, res) => {
  const { startDate, endDate } = req.query;
  let query = 'SELECT * FROM attendance WHERE user_id = ?';
  let params = [req.user.id];

  if (startDate && endDate) {
    query += ' AND date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  query += ' ORDER BY date DESC LIMIT 30';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ attendance: rows });
  });
});

// Get today's attendance status
app.get('/api/attendance/today', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  db.get(
    'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
    [req.user.id, today],
    (err, attendance) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ attendance: attendance || null });
    }
  );
});

// Admin routes
app.get('/api/admin/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  db.all('SELECT id, username, email, role, created_at FROM users', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ users: rows });
  });
});

app.get('/api/admin/attendance', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { startDate, endDate } = req.query;
  let query = `
    SELECT a.*, u.username, u.email 
    FROM attendance a 
    JOIN users u ON a.user_id = u.id
  `;
  let params = [];

  if (startDate && endDate) {
    query += ' WHERE a.date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  query += ' ORDER BY a.date DESC, a.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ attendance: rows });
  });
});

// Delete attendance record
app.delete('/api/attendance/:id', authenticateToken, (req, res) => {
  const attendanceId = req.params.id;
  console.log('Delete attendance request for ID:', attendanceId, 'by user:', req.user.id);
  
  // Check if user owns this record or is admin
  db.get(
    'SELECT user_id FROM attendance WHERE id = ?',
    [attendanceId],
    (err, record) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!record) {
        console.log('Attendance record not found');
        return res.status(404).json({ error: 'Attendance record not found' });
      }
      
      console.log('Found record, user_id:', record.user_id, 'requester:', req.user.id, 'role:', req.user.role);
      
      // Allow deletion if user owns the record or is admin
      if (record.user_id !== req.user.id && req.user.role !== 'admin') {
        console.log('Access denied - user does not own record and is not admin');
        return res.status(403).json({ error: 'Access denied' });
      }
      
      db.run('DELETE FROM attendance WHERE id = ?', [attendanceId], function(err) {
        if (err) {
          console.error('Delete error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        console.log('Delete successful, changes:', this.changes);
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Attendance record not found' });
        }
        
        res.json({ message: 'Attendance record deleted successfully' });
      });
    }
  );
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const userId = req.params.id;
  
  // Prevent admin from deleting themselves
  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  
  // Check if user exists
  db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user's attendance records first
    db.run('DELETE FROM attendance WHERE user_id = ?', [userId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Delete the user
      db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User and all associated data deleted successfully' });
      });
    });
  });
});

// Delete multiple attendance records (admin only)
app.delete('/api/admin/attendance/bulk', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Attendance record IDs are required' });
  }
  
  const placeholders = ids.map(() => '?').join(',');
  const query = `DELETE FROM attendance WHERE id IN (${placeholders})`;
  
  db.run(query, ids, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ 
      message: `${this.changes} attendance record(s) deleted successfully`,
      deletedCount: this.changes
    });
  });
});

// Get user's class information
app.get('/api/class', authenticateToken, (req, res) => {
  const query = `
    SELECT c.*, u.first_name as teacher_name, u.last_name as teacher_last_name
    FROM classes c
    LEFT JOIN users u ON c.teacher_id = u.id
    WHERE c.id = (SELECT class_id FROM users WHERE id = ?)
  `;
  
  db.get(query, [req.user.id], (err, classInfo) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ class: classInfo });
  });
});

// Get all students in user's class
app.get('/api/class/students', authenticateToken, (req, res) => {
  const query = `
    SELECT id, username, first_name, last_name, student_id, email, created_at
    FROM users 
    WHERE class_id = (SELECT class_id FROM users WHERE id = ?) 
    AND role = 'student'
    ORDER BY first_name, last_name
  `;
  
  db.all(query, [req.user.id], (err, students) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ students });
  });
});

// Get study materials for user's class
app.get('/api/study-materials', authenticateToken, (req, res) => {
  const query = `
    SELECT sm.*, u.first_name as uploaded_by_name, u.last_name as uploaded_by_last_name
    FROM study_materials sm
    LEFT JOIN users u ON sm.uploaded_by = u.id
    WHERE sm.class_id = (SELECT class_id FROM users WHERE id = ?)
    ORDER BY sm.created_at DESC
  `;
  
  db.all(query, [req.user.id], (err, materials) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ materials });
  });
});

// Upload study material (teacher only)
app.post('/api/study-materials', authenticateToken, upload.single('file'), (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Teacher access required' });
  }
  
  const { title, description, file_type } = req.body;
  const file = req.file;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  // Get user's class_id
  db.get('SELECT class_id FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user.class_id) {
      return res.status(400).json({ error: 'User is not assigned to a class' });
    }
    
    // Determine file type from uploaded file or provided type
    let finalFileType = file_type || 'document';
    let filePath = null;
    
    if (file) {
      finalFileType = path.extname(file.originalname).toLowerCase().substring(1);
      filePath = file.filename;
    }
    
    db.run(
      'INSERT INTO study_materials (title, description, file_type, file_path, class_id, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, finalFileType, filePath, user.class_id, req.user.id],
      function(err) {
        if (err) {
          // If database insert fails, delete the uploaded file
          if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ 
          message: 'Study material uploaded successfully',
          materialId: this.lastID 
        });
      }
    );
  });
});

// Get notices for user's class
app.get('/api/notices', authenticateToken, (req, res) => {
  const query = `
    SELECT n.*, u.first_name as created_by_name, u.last_name as created_by_last_name
    FROM notices n
    LEFT JOIN users u ON n.created_by = u.id
    WHERE n.class_id = (SELECT class_id FROM users WHERE id = ?)
    ORDER BY n.created_at DESC
  `;
  
  db.all(query, [req.user.id], (err, notices) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ notices });
  });
});

// Create notice (teacher/admin only)
app.post('/api/notices', authenticateToken, (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Teacher access required' });
  }
  
  const { title, content, priority } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  
  // Get user's class_id
  db.get('SELECT class_id FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user.class_id) {
      return res.status(400).json({ error: 'User is not assigned to a class' });
    }
    
    db.run(
      'INSERT INTO notices (title, content, class_id, created_by, priority) VALUES (?, ?, ?, ?, ?)',
      [title, content, user.class_id, req.user.id, priority || 'normal'],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ 
          message: 'Notice created successfully',
          noticeId: this.lastID 
        });
      }
    );
  });
});

// Get events for user's class
app.get('/api/events', authenticateToken, (req, res) => {
  const query = `
    SELECT e.*, u.first_name as created_by_name, u.last_name as created_by_last_name
    FROM events e
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.class_id = (SELECT class_id FROM users WHERE id = ?)
    ORDER BY e.event_date ASC
  `;
  
  db.all(query, [req.user.id], (err, events) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ events });
  });
});

// Create event (teacher/admin only)
app.post('/api/events', authenticateToken, (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Teacher access required' });
  }
  
  const { title, description, event_type, event_date, event_time } = req.body;
  
  if (!title || !event_date) {
    return res.status(400).json({ error: 'Title and event date are required' });
  }
  
  // Get user's class_id
  db.get('SELECT class_id FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user.class_id) {
      return res.status(400).json({ error: 'User is not assigned to a class' });
    }
    
    db.run(
      'INSERT INTO events (title, description, event_type, class_id, event_date, event_time, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, event_type || 'event', user.class_id, event_date, event_time, req.user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ 
          message: 'Event created successfully',
          eventId: this.lastID 
        });
      }
    );
  });
});

// Get student marks
app.get('/api/student-marks', authenticateToken, (req, res) => {
  const query = `
    SELECT sm.*, u.first_name as created_by_name, u.last_name as created_by_last_name
    FROM student_marks sm
    LEFT JOIN users u ON sm.created_by = u.id
    WHERE sm.student_id = ?
    ORDER BY sm.created_at DESC
  `;
  
  db.all(query, [req.user.id], (err, marks) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ marks });
  });
});

// Add student marks (teacher/admin only)
app.post('/api/student-marks', authenticateToken, (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Teacher access required' });
  }
  
  const { student_id, subject, exam_type, marks_obtained, total_marks } = req.body;
  
  if (!student_id || !subject || !exam_type || !marks_obtained || !total_marks) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  // Get user's class_id
  db.get('SELECT class_id FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user.class_id) {
      return res.status(400).json({ error: 'User is not assigned to a class' });
    }
    
    db.run(
      'INSERT INTO student_marks (student_id, subject, exam_type, marks_obtained, total_marks, class_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student_id, subject, exam_type, marks_obtained, total_marks, user.class_id, req.user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({ 
          message: 'Marks added successfully',
          markId: this.lastID 
        });
      }
    );
  });
});

// Get all classes (admin/teacher only)
app.get('/api/classes', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Admin or teacher access required' });
  }
  
  const query = `
    SELECT c.*, u.first_name as teacher_name, u.last_name as teacher_last_name,
           COUNT(s.id) as student_count
    FROM classes c
    LEFT JOIN users u ON c.teacher_id = u.id
    LEFT JOIN users s ON s.class_id = c.id AND s.role = 'student'
    GROUP BY c.id
    ORDER BY c.name
  `;
  
  db.all(query, [], (err, classes) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ classes });
  });
});

// Create class (admin only)
app.post('/api/classes', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { name, description, teacher_id } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Class name is required' });
  }
  
  db.run(
    'INSERT INTO classes (name, description, teacher_id) VALUES (?, ?, ?)',
    [name, description || null, teacher_id || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ 
        message: 'Class created successfully',
        classId: this.lastID 
      });
    }
  );
});

// Update class (admin only)
app.put('/api/classes/:classId', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { classId } = req.params;
  const { name, description, teacher_id } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Class name is required' });
  }
  
  db.run(
    'UPDATE classes SET name = ?, description = ?, teacher_id = ? WHERE id = ?',
    [name, description || null, teacher_id || null, classId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Class not found' });
      }
      
      res.json({ 
        message: 'Class updated successfully'
      });
    }
  );
});

// Get students in a specific class (admin/teacher only)
app.get('/api/classes/:classId/students', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Admin or teacher access required' });
  }
  
  const classId = req.params.classId;
  
  const query = `
    SELECT id, username, first_name, last_name, student_id, email, created_at
    FROM users 
    WHERE class_id = ? AND role = 'student'
    ORDER BY first_name, last_name
  `;
  
  db.all(query, [classId], (err, students) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ students });
  });
});

// Get attendance for a specific class (teacher/admin only)
app.get('/api/classes/:classId/attendance', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Admin or teacher access required' });
  }
  
  const classId = req.params.classId;
  const { startDate, endDate } = req.query;
  
  let query = `
    SELECT a.*, u.first_name, u.last_name, u.student_id
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    WHERE u.class_id = ?
  `;
  let params = [classId];
  
  if (startDate && endDate) {
    query += ' AND a.date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  
  query += ' ORDER BY a.date DESC, u.first_name, u.last_name';
  
  db.all(query, params, (err, attendance) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ attendance });
  });
});

// Serve the main page
// Serve uploaded files
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
