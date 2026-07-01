// controllers/adminController.js
const path           = require('path');
const dashboardModel = require('../models/dashboardModel');

exports.getDashboard = async (req, res) => {
  try {
    const [summary, recentEnrollments, courseBreakdown] = await Promise.all([
      dashboardModel.getSummary(),
      dashboardModel.getRecentEnrollments(),
      dashboardModel.getCourseBreakdown()
    ]);

    res.render('layouts/admin-layout', {
      title:            'Dashboard',
      user:             req.session.user,
      activePage:       'dashboard',
      pageView:         path.join(__dirname, '..', 'views', 'admin', 'dashboard.ejs'),
      summary,
      recentEnrollments,
      courseBreakdown
    });

  } catch (err) {
    console.error('[adminController][getDashboard]:', err);
    res.status(500).render('500', { title: 'Server Error', error: err });
  }
};