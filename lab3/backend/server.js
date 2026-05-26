const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASS || 'parola123',
  database: process.env.DB_NAME || 'userdb',
  port: 5432
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username=$1 AND password=$2',
      [username, password]
    );
    if (result.rows.length > 0) {
      res.json({ success: true, username: result.rows[0].username, name: result.rows[0].name });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    res.json({ success: false });
  }
});

app.get('/api/profile/:username', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT username, name FROM users WHERE username=$1',
      [req.params.username]
    );
    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    res.json({ success: false });
  }
});

app.post('/api/update-profile', async (req, res) => {
  const { username, name, newPassword } = req.body;
  try {
    if (newPassword) {
      await pool.query(
        'UPDATE users SET name=$1, password=$2 WHERE username=$3',
        [name, newPassword, username]
      );
    } else {
      await pool.query(
        'UPDATE users SET name=$1 WHERE username=$2',
        [name, username]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(4000, () => console.log('Backend pornit pe portul 4000'));