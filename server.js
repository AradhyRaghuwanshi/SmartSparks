const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sensor_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temperature REAL,
      humidity REAL,
      time TEXT,
      date TEXT
    )`);
  }
});

// Routes
app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [name, email, password], (err) => {
    if (err) {
      res.status(500).send('Error registering user');
    } else {
      res.send('User registered successfully');
    }
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
    if (err || !row) {
      res.status(401).send('Invalid credentials');
    } else {
      req.session.user = row;
      res.send('Login successful');
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.send('Logged out');
});

app.get('/user', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).send('Not logged in');
  }
});

app.post('/api/save-data', (req, res) => {
  const { temperature, humidity } = req.body;
  const date = new Date().toLocaleDateString('en-IN');
  const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  db.run(`INSERT INTO sensor_data (temperature, humidity, time, date) VALUES (?, ?, ?, ?)`, [temperature, humidity, time, date], (err) => {
    if (err) {
      res.status(500).send('Error saving data');
    } else {
      res.send('Data saved successfully');
    }
  });
});

app.get('/latest-data', (req, res) => {
  db.get(`SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1`, (err, row) => {
    if (err || !row) {
      res.status(500).send('Error fetching data');
    } else {
      res.json(row);
    }
  });
});

app.get('/all-records', (req, res) => {
  db.all(`SELECT * FROM sensor_data`, (err, rows) => {
    if (err) {
      res.status(500).send('Error fetching records');
    } else {
      res.json(rows);
    }
  });
});

app.delete('/delete-record/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM sensor_data WHERE id = ?`, [id], (err) => {
    if (err) {
      res.status(500).send('Error deleting record');
    } else {
      res.send('Record deleted successfully');
    }
  });
});

app.post('/save-lcd', (req, res) => {
  const { text } = req.body;
  fs.writeFile('./lcd.txt', text, (err) => {
    if (err) {
      res.status(500).send('Error saving text');
    } else {
      res.send('Text saved successfully');
    }
  });
});

app.get('/api/get-lcd', (req, res) => {
  fs.readFile('./lcd.txt', 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading text');
    } else {
      res.send(data);
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});