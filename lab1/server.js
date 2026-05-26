const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const { exec } = require('child_process');
const path = require('path');
const app = express();

// Porneste PostgreSQL local
exec('pg_ctlcluster 15 main start', (err) => {
  if (err) console.log('PostgreSQL pornit deja sau eroare:', err.message);
});

setTimeout(() => {
  const pool = new Pool({
    host: 'localhost',
    user: 'appuser',
    password: 'parola123',
    database: 'userdb',
    port: 5433
  });

  // Initializeaza baza de date
  pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50),
      password VARCHAR(50),
      name VARCHAR(100)
    );
    INSERT INTO users (username, password, name) VALUES ('admin', 'parola123', 'Administrator')
    ON CONFLICT DO NOTHING;
    INSERT INTO users (username, password, name) VALUES ('user1', 'pass123', 'User One')
    ON CONFLICT DO NOTHING;
  `).then(() => console.log('Baza de date initializata'))
    .catch(err => console.error('Eroare DB:', err));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(session({
    secret: 'secret123',
    resave: false,
    saveUninitialized: false
  }));

  // Pagina Login
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Login</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:Arial; display:flex; justify-content:center; align-items:center; height:100vh; background:#f0f2f5; }
          .box { background:white; padding:40px; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.1); width:320px; }
          h2 { text-align:center; color:#333; margin-bottom:24px; }
          input { width:100%; padding:12px; margin:8px 0; border:1px solid #ddd; border-radius:6px; font-size:15px; }
          button { width:100%; padding:12px; background:#4CAF50; color:white; border:none; border-radius:6px; cursor:pointer; font-size:16px; margin-top:8px; }
          button:hover { background:#45a049; }
          .error { color:red; text-align:center; margin-top:12px; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>Login</h2>
          <form method="POST" action="/login">
            <input type="text" name="username" placeholder="Username" required/>
            <input type="password" name="password" placeholder="Parola" required/>
            <button type="submit">Intra</button>
          </form>
          ${req.query.error ? '<p class="error">Username sau parola gresita!</p>' : ''}
        </div>
      </body>
      </html>
    `);
  });

  // Login
  app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE username=$1 AND password=$2',
        [username, password]
      );
      if (result.rows.length > 0) {
        req.session.user = result.rows[0];
        res.redirect('/profile');
      } else {
        res.redirect('/?error=1');
      }
    } catch (err) {
      res.redirect('/?error=1');
    }
  });

  // Pagina Profil
  app.get('/profile', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const user = req.session.user;
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Profil</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:Arial; background:#f0f2f5; min-height:100vh; }
          .navbar { background:#4CAF50; padding:16px 32px; color:white; display:flex; justify-content:space-between; align-items:center; }
          .navbar h2 { font-size:20px; }
          .navbar a { color:white; text-decoration:none; }
          .container { max-width:500px; margin:40px auto; padding:0 16px; }
          .card { background:white; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.1); padding:32px; }
          .hello { font-size:32px; color:#4CAF50; font-weight:bold; margin-bottom:8px; }
          .subtitle { color:#666; margin-bottom:24px; }
          label { display:block; color:#555; font-size:14px; margin-bottom:6px; margin-top:16px; }
          input { width:100%; padding:12px; border:1px solid #ddd; border-radius:6px; font-size:15px; }
          button { width:100%; padding:12px; background:#4CAF50; color:white; border:none; border-radius:6px; cursor:pointer; font-size:16px; margin-top:24px; }
          button:hover { background:#45a049; }
          .success { color:#4CAF50; text-align:center; margin-top:12px; display:none; }
          hr { border:none; border-top:1px solid #eee; margin:24px 0; }
        </style>
      </head>
      <body>
        <div class="navbar">
          <h2>Profilul Meu</h2>
          <a href="/logout">Logout</a>
        </div>
        <div class="container">
          <div class="card">
            <div class="hello">Hello, ${user.name || user.username}!</div>
            <div class="subtitle">Username: ${user.username}</div>
            <hr>
            <form method="POST" action="/update-profile">
              <label>Nume complet</label>
              <input type="text" name="name" value="${user.name || ''}" placeholder="Numele tau"/>
              <label>Parola noua (optional)</label>
              <input type="password" name="newPassword" placeholder="Lasa gol daca nu vrei sa schimbi"/>
              <label>Confirma parola noua</label>
              <input type="password" name="confirmPassword" placeholder="Repeta parola noua"/>
              <button type="submit">Salveaza modificarile</button>
            </form>
            ${req.query.saved ? '<p class="success" style="display:block">Profil actualizat cu succes!</p>' : ''}
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Actualizeaza profil
  app.post('/update-profile', async (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const { name, newPassword, confirmPassword } = req.body;
    const username = req.session.user.username;
    try {
      if (newPassword && newPassword === confirmPassword) {
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
      req.session.user.name = name;
      res.redirect('/profile?saved=1');
    } catch (err) {
      res.redirect('/profile');
    }
  });

  // Logout
  app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
  });

  app.listen(3000, () => console.log('Server pornit pe portul 3000'));
}, 5000);