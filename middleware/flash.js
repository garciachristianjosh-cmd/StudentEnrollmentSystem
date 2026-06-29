// middleware/flash.js

/**
 * Minimal flash message middleware.
 *
 * Usage in a controller (before redirect):
 *   req.flash('success', 'Student created successfully.');
 *   req.flash('error',   'Something went wrong.');
 *
 * Usage in a view:
 *   <%= flash.success %>
 *   <%= flash.error %>
 */
exports.flashMiddleware = (req, res, next) => {
  // Make flash writer available on req
  req.flash = (type, message) => {
    if (!req.session.flash) req.session.flash = {};
    req.session.flash[type] = message;
  };

  // Make flash reader available in all EJS templates
  res.locals.flash = req.session.flash || {};

  // Clear flash from session so it only shows once
  delete req.session.flash;

  next();
};