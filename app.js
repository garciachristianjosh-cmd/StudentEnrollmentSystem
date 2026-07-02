// app.js
const express      = require('express');
const session      = require('express-session');
const path         = require('path');
const helmet       = require('helmet');
require('dotenv').config();

const { flashMiddleware } = require('./middleware/flash');

const app = express();

// ─── Security Headers ────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      styleSrc:    ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      fontSrc:     ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc:      ["'self'", "data:"],
      connectSrc:  ["'self'"]
    }
  }
}));

// ─── View Engine ─────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Static Files ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Body Parsers ────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Session ─────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge:   1000 * 60 * 60 * 2 // 2 hours
  }
}));

// ─── Flash ───────────────────────────────────────────────────
app.use(flashMiddleware);
// Ensure flash is always available in every view
app.use((req, res, next) => {
  res.locals.flash = res.locals.flash || {};
  next();
});

app.use('/', require('./routes/public'));

// ─── Routes ──────────────────────────────────────────────────
app.use('/',        require('./routes/index'));
app.use('/auth',    require('./routes/auth'));
app.use('/admin',   require('./routes/admin'));
app.use('/student', require('./routes/student'));

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// ─── 500 Handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', {
    title: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err : null
  });
});

module.exports = app;