const express = require('express');
const { Pool } = require('pg');
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

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Render
});

// Create tables on startup
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sensor_data (
        id SERIAL PRIMARY KEY,
        temperature REAL,
        humidity REAL,
        time TEXT,
        date TEXT
      )
    `);
    console.log('Database tables ready');
  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
};
initDB();

// Routes

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    await pool.query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3)`,
      [name, email, password]
    );
    res.send('User registered successfully');
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).send('Error registering user');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 AND password = $2`,
      [email, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).send('Invalid credentials');
    }
    req.session.user = result.rows[0];
    res.send('Login successful');
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(401).send('Invalid credentials');
  }
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

app.post('/api/save-data', async (req, res) => {
  const { temperature, humidity } = req.body;
  const date = new Date().toLocaleDateString('en-IN');
  const time = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  try {
    await pool.query(
      `INSERT INTO sensor_data (temperature, humidity, time, date) VALUES ($1, $2, $3, $4)`,
      [temperature, humidity, time, date]
    );
    res.send('Data saved successfully');
  } catch (err) {
    console.error('Save data error:', err.message);
    res.status(500).send('Error saving data');
  }
});

app.get('/latest-data', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1`
    );
    if (result.rows.length === 0) {
      return res.status(500).send('No data found');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Latest data error:', err.message);
    res.status(500).send('Error fetching data');
  }
});

app.get('/all-records', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM sensor_data ORDER BY id ASC`);
    res.json(result.rows);
  } catch (err) {
    console.error('All records error:', err.message);
    res.status(500).send('Error fetching records');
  }
});

app.delete('/delete-record/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM sensor_data WHERE id = $1`, [id]);
    res.send('Record deleted successfully');
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).send('Error deleting record');
  }
});

// LCD text stored in memory (file system not persistent on Render)
let lcdTextStore = '';

app.post('/save-lcd', (req, res) => {
  const { text } = req.body;
  lcdTextStore = text;
  res.send('Text saved successfully');
});

app.get('/api/get-lcd', (req, res) => {
  res.send(lcdTextStore);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});