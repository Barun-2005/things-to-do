const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');  // For MySQL integration
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const saltRounds = 10;  
const crypto = require('crypto');
const secretKey = crypto.randomBytes(64).toString('hex');

const app = express();

// MySQL Database Connection
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',        
    password: 'barun@2005', 
    database: 'Todo',      
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));  // Serves static files (like CSS)
app.use(session({
    secret: secretKey, // Change this to a strong secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using HTTPS in production
}));

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// Session setup (if you are using sessions)
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Serve login and register HTML pages
app.get('/', (_, res) => {
    res.sendFile(__dirname + '/templates/index.html');
});

app.get('/register', (_, res) => {
    res.sendFile(__dirname + '/templates/register.html');
});

app.get('/login', (_, res) => {
    res.sendFile(__dirname + '/templates/index.html');
});

app.get('/list', isAuthenticated, (_, res) => {
    res.sendFile(__dirname + '/templates/list.html');
});

// Password strength check on the server side
function checkPasswordStrength(password) {
    const regexWeak = /^(?=.*[a-z]).{8,}$/;
    const regexMedium = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    const regexStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{8,}$/;

    if (regexStrong.test(password)) {
        return 'Strong';
    } else if (regexMedium.test(password)) {
        return 'Medium';
    } else if (regexWeak.test(password)) {
        return 'Weak';
    }
    return '';
}

// Handle registration form submission (POST request)
app.post('/register', (req, res) => {
    const { username, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        res.status(400).send('Passwords do not match');
        return;
    }

    if (!username || !password) {
        res.status(400).send('Username and password are required');
        return;
    }

    // Hash the password
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err.message);
            res.status(500).send('Internal Server Error');
            return;
        }

        // Insert into the database
        pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], (error) => {
            if (error) {
                console.error('Error inserting user:', error.message);
                res.status(500).send('Internal Server Error');
                return;
            }
            res.redirect('/login');
        });
    });
});

// Handle login form submission (POST request)
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    pool.query('SELECT * FROM users WHERE username = ?', [username], (error, results) => {
        if (error) {
            console.error('Error querying user:', error.message);
            res.status(500).send('Internal Server Error');
            return;
        }

        if (results.length > 0) {
            const user = results[0];

            // Compare the hashed password
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) {
                    console.error('Error comparing passwords:', err.message);
                    res.status(500).send('Internal Server Error');
                    return;
                }

                if (isMatch) {
                    // Set the session and redirect to list
                    req.session.userId = user.id;
                    res.redirect('/list');
                } else {
                    res.send('Invalid username or password');
                }
            });
        } else {
            res.send('Invalid username or password');
        }
    });
});

// Logout route to destroy the session
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Unable to log out');
        }
        res.redirect('/login');
    });
});

// To-Do List Routes

// Fetch all tasks for the logged-in user (GET request)
app.get('/tasks', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    pool.query('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC', [userId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results);
    });
});

// Add a new task (POST request)
app.post('/add-task', isAuthenticated, (req, res) => {
    const { task } = req.body;
    const userId = req.session.userId;

    if (!task) {
        return res.status(400).json({ error: 'Task cannot be empty' });
    }

    pool.query('INSERT INTO todos (task, user_id) VALUES (?, ?)', [task, userId], (error) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to add task' });
        }
        res.redirect('/list');
    });
});

// Delete a task (DELETE request)
app.delete('/delete-task/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    pool.query('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, userId], (error) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to delete task' });
        }
        res.json({ message: 'Task deleted successfully' });
    });
});

// Add the /logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Unable to log out');
        }
        res.redirect('/login');  // Redirect to login page after logging out
    });
});

// Start the server
const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
