const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();

// ─── View Engine ────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Static Files ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Body Parsers ───────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Session ────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 2 // 2 hours
  }
}));

const { flashMiddleware } = require('./middleware/flash');

// place this line after app.use(session({...}))
app.use(flashMiddleware);

// ─── Routes ─────────────────────────────────────────────────────────────────
// ─── Routes ─────────────────────────────────────────────────
const indexRoutes   = require('./routes/index');
const authRoutes    = require('./routes/auth');
const adminRoutes   = require('./routes/admin');
const studentRoutes = require('./routes/student');

app.use('/',        indexRoutes);
app.use('/auth',    authRoutes);
app.use('/admin',   adminRoutes);
app.use('/student', studentRoutes);;

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

module.exports = app;

// ─── 500 Handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', { title: 'Server Error', error: err });
});