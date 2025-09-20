// Global variables
let currentUser = null;
let authToken = null;

// DOM elements
const loginPage = document.getElementById('loginPage');
const signupPage = document.getElementById('signupPage');
const studentDashboard = document.getElementById('studentDashboard');
const teacherDashboard = document.getElementById('teacherDashboard');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const loadingSpinner = document.getElementById('loadingSpinner');
const toastContainer = document.getElementById('toastContainer');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    updateCurrentDate();
});

function initializeApp() {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        showRoleBasedDashboard();
        loadDashboardData();
    } else {
        showLoginPage();
    }
}

function setupEventListeners() {
    // Auth page switching
    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupPage();
    });
    
    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginPage();
    });
    
    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    
    // Logout buttons
    document.getElementById('studentLogoutBtn').addEventListener('click', handleLogout);
    document.getElementById('teacherLogoutBtn').addEventListener('click', handleLogout);
    document.getElementById('adminLogoutBtn').addEventListener('click', handleLogout);
    
    // Student attendance
    document.getElementById('studentCheckInBtn').addEventListener('click', handleCheckIn);
    document.getElementById('studentCheckOutBtn').addEventListener('click', handleCheckOut);
    
    // Teacher forms
    document.getElementById('materialUploadForm').addEventListener('submit', handleMaterialUpload);
    document.getElementById('noticeCreateForm').addEventListener('submit', handleNoticeCreate);
    document.getElementById('marksAddForm').addEventListener('submit', handleMarksAdd);
    document.getElementById('eventCreateForm').addEventListener('submit', handleEventCreate);
    
    // Admin forms
    document.getElementById('userCreateForm').addEventListener('submit', handleUserCreate);
    document.getElementById('classCreateForm').addEventListener('submit', handleClassCreate);
}

// Page navigation
function showLoginPage() {
    hideAllPages();
    loginPage.classList.add('active');
}

function showSignupPage() {
    hideAllPages();
    signupPage.classList.add('active');
}

function showRoleBasedDashboard() {
    hideAllPages();
    
    if (currentUser.role === 'student') {
        studentDashboard.classList.add('active');
        updateStudentInfo();
    } else if (currentUser.role === 'teacher') {
        teacherDashboard.classList.add('active');
        updateTeacherInfo();
    } else if (currentUser.role === 'admin') {
        adminDashboard.classList.add('active');
        updateAdminInfo();
    }
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(loginForm);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            authToken = result.token;
            currentUser = result.user;
            
            // Store in localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showToast('Login successful!', 'success');
            showRoleBasedDashboard();
            loadDashboardData();
        } else {
            showToast(result.error || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleSignup(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(signupForm);
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        role: formData.get('role')
    };
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            authToken = result.token;
            currentUser = result.user;
            
            // Store in localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showToast('Account created successfully!', 'success');
            showRoleBasedDashboard();
            loadDashboardData();
        } else {
            showToast(result.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    showToast('Logged out successfully', 'success');
    showLoginPage();
}

// User info updates
function updateStudentInfo() {
    const userInfo = document.getElementById('studentUserInfo');
    const studentName = document.getElementById('studentName');
    if (currentUser) {
        userInfo.textContent = `Welcome, ${currentUser.username}`;
        studentName.textContent = currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser.username;
    }
}

function updateTeacherInfo() {
    const userInfo = document.getElementById('teacherUserInfo');
    const teacherName = document.getElementById('teacherName');
    if (currentUser) {
        userInfo.textContent = `Welcome, ${currentUser.username}`;
        teacherName.textContent = currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser.username;
    }
}

function updateAdminInfo() {
    const userInfo = document.getElementById('adminUserInfo');
    if (currentUser) {
        userInfo.textContent = `Welcome, ${currentUser.username}`;
    }
}

function updateCurrentDate() {
    const dateElements = ['studentCurrentDate', 'teacherCurrentDate', 'adminCurrentDate'];
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateString = now.toLocaleDateString('en-US', options);
    
    dateElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = dateString;
        }
    });
}

// Dashboard data loading
async function loadDashboardData() {
    if (currentUser.role === 'student') {
        await loadStudentData();
    } else if (currentUser.role === 'teacher') {
        await loadTeacherData();
    } else if (currentUser.role === 'admin') {
        await loadAdminData();
    }
}

// Student functions
async function loadStudentData() {
    await Promise.all([
        loadStudentAttendance(),
        loadStudyMaterials(),
        loadClassInfo(),
        loadClassStudents(),
        loadEvents(),
        loadStudentMarks(),
        loadNotices()
    ]);
}

async function loadStudentAttendance() {
    try {
        const response = await fetch('/api/attendance/today', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            updateStudentAttendanceStatus(result.attendance);
        }
    } catch (error) {
        console.error('Error loading student attendance:', error);
    }
}

function updateStudentAttendanceStatus(attendance) {
    const statusIcon = document.getElementById('studentStatusIcon');
    const statusTitle = document.getElementById('studentStatusTitle');
    const statusMessage = document.getElementById('studentStatusMessage');
    const checkInTime = document.getElementById('studentCheckInTime');
    const checkOutTime = document.getElementById('studentCheckOutTime');
    const hoursWorked = document.getElementById('studentHoursWorked');
    const checkInBtn = document.getElementById('studentCheckInBtn');
    const checkOutBtn = document.getElementById('studentCheckOutBtn');
    
    if (!attendance) {
        statusIcon.className = 'fas fa-clock';
        statusTitle.textContent = 'Ready to Check In';
        statusMessage.textContent = 'Click the button below to mark your attendance';
        checkInBtn.disabled = false;
        checkOutBtn.disabled = true;
        checkInTime.textContent = '--:--';
        checkOutTime.textContent = '--:--';
        hoursWorked.textContent = '--:--';
    } else if (attendance.check_in && !attendance.check_out) {
        statusIcon.className = 'fas fa-sign-in-alt';
        statusTitle.textContent = 'Checked In';
        statusMessage.textContent = 'You are currently checked in';
        checkInBtn.disabled = true;
        checkOutBtn.disabled = false;
        checkInTime.textContent = attendance.check_in;
        checkOutTime.textContent = '--:--';
        hoursWorked.textContent = calculateHoursWorked(attendance.check_in, null);
    } else if (attendance.check_in && attendance.check_out) {
        statusIcon.className = 'fas fa-check-circle';
        statusTitle.textContent = 'Attendance Complete';
        statusMessage.textContent = 'You have completed your attendance for today';
        checkInBtn.disabled = true;
        checkOutBtn.disabled = true;
        checkInTime.textContent = attendance.check_in;
        checkOutTime.textContent = attendance.check_out;
        hoursWorked.textContent = calculateHoursWorked(attendance.check_in, attendance.check_out);
    }
}

// Student section navigation
function showStudentSection(section) {
    // Hide all sections
    document.querySelectorAll('#studentContent .content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(section + 'Section').classList.add('active');
    
    // Load section-specific data
    if (section === 'attendance') {
        loadStudentAttendance();
    } else if (section === 'materials') {
        loadStudyMaterials();
    } else if (section === 'class') {
        loadClassInfo();
        loadClassStudents();
    } else if (section === 'events') {
        loadEvents();
    } else if (section === 'marks') {
        loadStudentMarks();
    } else if (section === 'notices') {
        loadNotices();
    }
}

// Teacher section navigation
function showTeacherSection(section) {
    // Hide all sections
    document.querySelectorAll('#teacherContent .content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById('teacher' + section.charAt(0).toUpperCase() + section.slice(1) + 'Section').classList.add('active');
    
    // Load section-specific data
    if (section === 'materials') {
        loadStudyMaterials();
    } else if (section === 'notices') {
        loadNotices();
    } else if (section === 'events') {
        loadEvents();
    } else if (section === 'students') {
        loadClassStudents();
    } else if (section === 'marks') {
        loadTeacherMarks();
    }
}

// Admin section navigation
function showAdminSection(section) {
    // Hide all sections
    document.querySelectorAll('#adminContent .content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById('admin' + section.charAt(0).toUpperCase() + section.slice(1) + 'Section').classList.add('active');
    
    // Load section-specific data
    if (section === 'users') {
        loadAdminUsers();
    } else if (section === 'classes') {
        loadAdminClasses();
    } else if (section === 'attendance') {
        loadAdminAttendance();
    } else if (section === 'reports') {
        loadAdminReports();
    }
}

// Attendance functions
async function handleCheckIn() {
    showLoading();
    
    try {
        const response = await fetch('/api/attendance/check-in', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Check-in successful!', 'success');
            loadStudentAttendance();
        } else {
            showToast(result.error || 'Check-in failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleCheckOut() {
    showLoading();
    
    try {
        const response = await fetch('/api/attendance/check-out', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Check-out successful!', 'success');
            loadStudentAttendance();
        } else {
            showToast(result.error || 'Check-out failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Utility functions
function calculateHoursWorked(checkIn, checkOut) {
    if (!checkIn) return '--:--';
    
    const now = new Date();
    const checkInTime = new Date(`${now.toDateString()} ${checkIn}`);
    const checkOutTime = checkOut ? new Date(`${now.toDateString()} ${checkOut}`) : now;
    
    const diffMs = checkOutTime - checkInTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showLoading() {
    loadingSpinner.classList.add('show');
}

function hideLoading() {
    loadingSpinner.classList.remove('show');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fas fa-check-circle' : 
                 type === 'error' ? 'fas fa-exclamation-circle' : 
                 'fas fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

// Data loading functions
async function loadStudyMaterials() {
    try {
        const response = await fetch('/api/study-materials', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayStudyMaterials(result.materials);
        }
    } catch (error) {
        console.error('Error loading study materials:', error);
    }
}

function displayStudyMaterials(materials) {
    const container = document.getElementById('studyMaterialsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (materials.length === 0) {
        container.innerHTML = '<p class="text-center">No study materials available</p>';
        return;
    }
    
    materials.forEach(material => {
        const card = document.createElement('div');
        card.className = 'material-card';
        
        let downloadButton = '';
        if (material.file_path) {
            downloadButton = `
                <div class="material-actions">
                    <a href="/uploads/${material.file_path}" target="_blank" class="btn btn-primary btn-sm">
                        <i class="fas fa-download"></i> Download
                    </a>
                </div>
            `;
        }
        
        card.innerHTML = `
            <h4>${material.title}</h4>
            <p>${material.description || 'No description available'}</p>
            <div class="material-meta">
                <span class="file-type">${material.file_type.toUpperCase()}</span>
                <span>${formatDate(material.created_at)}</span>
            </div>
            ${downloadButton}
        `;
        container.appendChild(card);
    });
}

async function loadClassInfo() {
    try {
        const response = await fetch('/api/class', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayClassInfo(result.class);
        }
    } catch (error) {
        console.error('Error loading class info:', error);
    }
}

function displayClassInfo(classInfo) {
    const container = document.getElementById('classInfo');
    if (!container) return;
    
    if (classInfo) {
        container.innerHTML = `
            <h3>${classInfo.name}</h3>
            <p><strong>Description:</strong> ${classInfo.description || 'No description available'}</p>
            <p><strong>Teacher:</strong> ${classInfo.teacher_name ? `${classInfo.teacher_name} ${classInfo.teacher_last_name}` : 'Not assigned'}</p>
        `;
    } else {
        container.innerHTML = '<p>No class information available</p>';
    }
}

async function loadClassStudents() {
    try {
        const response = await fetch('/api/class/students', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayClassStudents(result.students);
        }
    } catch (error) {
        console.error('Error loading class students:', error);
    }
}

function displayClassStudents(students) {
    const container = document.getElementById('classStudentsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (students.length === 0) {
        container.innerHTML = '<p class="text-center">No students in this class</p>';
        return;
    }
    
    students.forEach(student => {
        const card = document.createElement('div');
        card.className = 'student-card';
        card.innerHTML = `
            <h4>${student.first_name ? `${student.first_name} ${student.last_name}` : student.username}</h4>
            <p>Student ID: ${student.student_id || 'N/A'}</p>
            <p>Email: ${student.email}</p>
        `;
        container.appendChild(card);
    });
}

async function loadEvents() {
    try {
        const response = await fetch('/api/events', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayEvents(result.events);
        }
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

function displayEvents(events) {
    const container = document.getElementById('eventsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (events.length === 0) {
        container.innerHTML = '<p class="text-center">No events scheduled</p>';
        return;
    }
    
    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <h4>${event.title}</h4>
            <p>${event.description || 'No description available'}</p>
            <div class="event-meta">
                <span>${event.event_type}</span>
                <span>${formatDate(event.event_date)} ${event.event_time ? `at ${event.event_time}` : ''}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

async function loadStudentMarks() {
    try {
        const response = await fetch('/api/student-marks', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayStudentMarks(result.marks);
        }
    } catch (error) {
        console.error('Error loading student marks:', error);
    }
}

function displayStudentMarks(marks) {
    const container = document.getElementById('marksList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (marks.length === 0) {
        container.innerHTML = '<p class="text-center">No marks available</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'history-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Subject</th>
                <th>Exam Type</th>
                <th>Marks Obtained</th>
                <th>Total Marks</th>
                <th>Percentage</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
            ${marks.map(mark => `
                <tr>
                    <td>${mark.subject}</td>
                    <td>${mark.exam_type}</td>
                    <td>${mark.marks_obtained}</td>
                    <td>${mark.total_marks}</td>
                    <td>${((mark.marks_obtained / mark.total_marks) * 100).toFixed(1)}%</td>
                    <td>${formatDate(mark.created_at)}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

async function loadNotices() {
    try {
        const response = await fetch('/api/notices', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayNotices(result.notices);
        }
    } catch (error) {
        console.error('Error loading notices:', error);
    }
}

function displayNotices(notices) {
    const container = document.getElementById('noticesList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (notices.length === 0) {
        container.innerHTML = '<p class="text-center">No notices available</p>';
        return;
    }
    
    notices.forEach(notice => {
        const card = document.createElement('div');
        card.className = `notice-card ${notice.priority}`;
        card.innerHTML = `
            <h4>${notice.title}</h4>
            <p>${notice.content}</p>
            <div class="notice-meta">
                <span>Priority: ${notice.priority}</span>
                <span>${formatDate(notice.created_at)}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

async function loadTeacherData() {
    await Promise.all([
        loadStudyMaterials(),
        loadNotices(),
        loadEvents(),
        loadClassStudents(),
        loadTeacherMarks()
    ]);
}

async function loadAdminData() {
    await Promise.all([
        loadAdminUsers(),
        loadAdminClasses(),
        loadAdminAttendance(),
        loadAdminReports()
    ]);
}

async function loadAdminUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayAdminUsers(result.users);
        }
    } catch (error) {
        console.error('Error loading admin users:', error);
    }
}

function displayAdminUsers(users) {
    const container = document.getElementById('adminUsersTable');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (users.length === 0) {
        container.innerHTML = '<p class="text-center">No users found</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'history-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td><span class="status-${user.role.toLowerCase()}">${user.role}</span></td>
                    <td>${formatDate(user.created_at)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})" ${user.id === currentUser.id ? 'disabled' : ''}>
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

async function loadAdminClasses() {
    try {
        const response = await fetch('/api/classes', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayAdminClasses(result.classes);
        }
    } catch (error) {
        console.error('Error loading admin classes:', error);
    }
}

function displayAdminClasses(classes) {
    const container = document.getElementById('adminClassesTable');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (classes.length === 0) {
        container.innerHTML = '<p class="text-center">No classes found</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'history-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Teacher</th>
                <th>Students</th>
                <th>Created</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${classes.map(cls => `
                <tr>
                    <td>${cls.id}</td>
                    <td>${cls.name}</td>
                    <td>${cls.description || 'N/A'}</td>
                    <td>${cls.teacher_name ? `${cls.teacher_name} ${cls.teacher_last_name}` : 'Not assigned'}</td>
                    <td>${cls.student_count}</td>
                    <td>${formatDate(cls.created_at)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-primary btn-sm" onclick="editClass(${cls.id}, '${cls.name}', '${cls.description || ''}', ${cls.teacher_id || 'null'})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

async function loadAdminAttendance() {
    try {
        const response = await fetch('/api/admin/attendance', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayAdminAttendance(result.attendance);
        }
    } catch (error) {
        console.error('Error loading admin attendance:', error);
    }
}

function displayAdminAttendance(attendance) {
    const container = document.getElementById('adminAttendanceTable');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (attendance.length === 0) {
        container.innerHTML = '<p class="text-center">No attendance records found</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'history-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>User</th>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
            </tr>
        </thead>
        <tbody>
            ${attendance.map(record => `
                <tr>
                    <td>${record.username} (${record.email})</td>
                    <td>${formatDate(record.date)}</td>
                    <td>${record.check_in || '--:--'}</td>
                    <td>${record.check_out || '--:--'}</td>
                    <td>${calculateHoursWorked(record.check_in, record.check_out)}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

async function loadAdminReports() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const users = result.users;
            const students = users.filter(u => u.role === 'student');
            const teachers = users.filter(u => u.role === 'teacher');
            
            document.getElementById('totalUsers').textContent = users.length;
            document.getElementById('activeStudents').textContent = students.length;
            
            // Load classes count
            const classesResponse = await fetch('/api/classes', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (classesResponse.ok) {
                const classesResult = await classesResponse.json();
                document.getElementById('totalClasses').textContent = classesResult.classes.length;
            }
            
            // Load today's attendance
            const attendanceResponse = await fetch('/api/admin/attendance', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (attendanceResponse.ok) {
                const attendanceResult = await attendanceResponse.json();
                const today = new Date().toISOString().split('T')[0];
                const todayAttendance = attendanceResult.attendance.filter(a => a.date === today);
                document.getElementById('todayAttendance').textContent = todayAttendance.length;
            }
        }
    } catch (error) {
        console.error('Error loading admin reports:', error);
    }
}

async function loadTeacherMarks() {
    try {
        const response = await fetch('/api/student-marks', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayTeacherMarks(result.marks);
        }
    } catch (error) {
        console.error('Error loading teacher marks:', error);
    }
}

function displayTeacherMarks(marks) {
    const container = document.getElementById('teacherMarksTable');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (marks.length === 0) {
        container.innerHTML = '<p class="text-center">No marks available</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'history-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Student</th>
                <th>Subject</th>
                <th>Exam Type</th>
                <th>Marks Obtained</th>
                <th>Total Marks</th>
                <th>Percentage</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
            ${marks.map(mark => `
                <tr>
                    <td>Student ID: ${mark.student_id}</td>
                    <td>${mark.subject}</td>
                    <td>${mark.exam_type}</td>
                    <td>${mark.marks_obtained}</td>
                    <td>${mark.total_marks}</td>
                    <td>${((mark.marks_obtained / mark.total_marks) * 100).toFixed(1)}%</td>
                    <td>${formatDate(mark.created_at)}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

// Form handlers
async function handleMaterialUpload(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/study-materials', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
                // Don't set Content-Type, let browser set it for FormData
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Study material uploaded successfully!', 'success');
            hideUploadMaterialForm();
            loadStudyMaterials();
        } else {
            showToast(result.error || 'Upload failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleNoticeCreate(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    const data = {
        title: formData.get('title'),
        content: formData.get('content'),
        priority: formData.get('priority')
    };
    
    try {
        const response = await fetch('/api/notices', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Notice created successfully!', 'success');
            hideCreateNoticeForm();
            loadNotices();
        } else {
            showToast(result.error || 'Notice creation failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleMarksAdd(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    const data = {
        student_id: formData.get('student_id'),
        subject: formData.get('subject'),
        exam_type: formData.get('exam_type'),
        marks_obtained: parseInt(formData.get('marks_obtained')),
        total_marks: parseInt(formData.get('total_marks'))
    };
    
    try {
        const response = await fetch('/api/student-marks', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Marks added successfully!', 'success');
            hideAddMarksForm();
            loadTeacherMarks();
        } else {
            showToast(result.error || 'Failed to add marks', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleEventCreate(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        event_type: formData.get('event_type'),
        event_date: formData.get('event_date'),
        event_time: formData.get('event_time')
    };
    
    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Event created successfully!', 'success');
            hideCreateEventForm();
            loadEvents();
        } else {
            showToast(result.error || 'Event creation failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleUserCreate(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        role: formData.get('role'),
        class_id: formData.get('class_id') || null
    };
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('User created successfully!', 'success');
            hideCreateUserForm();
            loadAdminUsers();
        } else {
            showToast(result.error || 'User creation failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function handleClassCreate(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        teacher_id: formData.get('teacher_id') || null
    };
    
    try {
        const response = await fetch('/api/classes', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Class created successfully!', 'success');
            hideCreateClassForm();
            loadAdminClasses();
        } else {
            showToast(result.error || 'Class creation failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Form visibility functions
function showUploadMaterialForm() {
    document.getElementById('uploadMaterialForm').style.display = 'block';
}

function hideUploadMaterialForm() {
    document.getElementById('uploadMaterialForm').style.display = 'none';
    document.getElementById('materialUploadForm').reset();
}

function showCreateNoticeForm() {
    document.getElementById('createNoticeForm').style.display = 'block';
}

function hideCreateNoticeForm() {
    document.getElementById('createNoticeForm').style.display = 'none';
    document.getElementById('noticeCreateForm').reset();
}

function showAddMarksForm() {
    document.getElementById('addMarksForm').style.display = 'block';
    loadStudentsForMarks();
}

function hideAddMarksForm() {
    document.getElementById('addMarksForm').style.display = 'none';
    document.getElementById('marksAddForm').reset();
}

function showCreateEventForm() {
    document.getElementById('createEventForm').style.display = 'block';
}

function hideCreateEventForm() {
    document.getElementById('createEventForm').style.display = 'none';
    document.getElementById('eventCreateForm').reset();
}

function showCreateUserForm() {
    document.getElementById('createUserForm').style.display = 'block';
    loadClassesForUserForm();
}

function hideCreateUserForm() {
    document.getElementById('createUserForm').style.display = 'none';
    document.getElementById('userCreateForm').reset();
}

function showCreateClassForm() {
    document.getElementById('createClassForm').style.display = 'block';
    loadTeachersForClassForm();
}

function hideCreateClassForm() {
    document.getElementById('createClassForm').style.display = 'none';
    document.getElementById('classCreateForm').reset();
}

// Data loading functions for forms
async function loadStudentsForMarks() {
    try {
        const response = await fetch('/api/class/students', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const select = document.getElementById('marksStudent');
            select.innerHTML = '<option value="">Select Student</option>';
            result.students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = student.first_name ? `${student.first_name} ${student.last_name}` : student.username;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading students for marks:', error);
    }
}

async function loadClassesForUserForm() {
    try {
        const response = await fetch('/api/classes', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const select = document.getElementById('userClass');
            select.innerHTML = '<option value="">Select Class (Optional)</option>';
            result.classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading classes for user form:', error);
    }
}

async function loadTeachersForClassForm() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const select = document.getElementById('classTeacher');
            select.innerHTML = '<option value="">Select Teacher (Optional)</option>';
            result.users.forEach(user => {
                if (user.role === 'teacher') {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.username;
                    select.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error loading teachers for class form:', error);
    }
}

// Delete function
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their attendance records. This action cannot be undone.')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('User deleted successfully', 'success');
            loadAdminUsers();
        } else {
            showToast(result.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Class editing functions
function editClass(classId, name, description, teacherId) {
    document.getElementById('editClassId').value = classId;
    document.getElementById('editClassName').value = name;
    document.getElementById('editClassDescription').value = description;
    document.getElementById('editClassTeacher').value = teacherId || '';
    
    // Load teachers for the dropdown
    loadTeachersForEditForm();
    
    // Show modal
    document.getElementById('editClassModal').style.display = 'flex';
}

function closeEditClassModal() {
    document.getElementById('editClassModal').style.display = 'none';
    document.getElementById('editClassForm').reset();
}

async function loadTeachersForEditForm() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const select = document.getElementById('editClassTeacher');
            select.innerHTML = '<option value="">Select Teacher (Optional)</option>';
            result.users.forEach(user => {
                if (user.role === 'teacher') {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.username;
                    select.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error loading teachers for edit form:', error);
    }
}

// Handle edit class form submission
document.addEventListener('DOMContentLoaded', function() {
    const editClassForm = document.getElementById('editClassForm');
    if (editClassForm) {
        editClassForm.addEventListener('submit', handleClassEdit);
    }
});

async function handleClassEdit(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    const classId = formData.get('classId');
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        teacher_id: formData.get('teacher_id') || null
    };
    
    try {
        const response = await fetch(`/api/classes/${classId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Class updated successfully!', 'success');
            closeEditClassModal();
            loadAdminClasses();
        } else {
            showToast(result.error || 'Class update failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}
