exports.getHomepage = (req, res) => {
  res.render('index', {
    title: 'Student Enrollment System'
  });
};