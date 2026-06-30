// public/js/main.js

document.addEventListener('DOMContentLoaded', function () {

  // ─── Print Button ───────────────────────────────────────────
  const printBtn = document.getElementById('printReportBtn');
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      window.print();
    });
  }

  // ─── Toggle password visibility ─────────────────────────────
  const togglePassword = document.getElementById('togglePassword');
  if (togglePassword) {
    togglePassword.addEventListener('click', function () {
      const input = document.getElementById('password');
      const icon  = document.getElementById('eyeIcon');
      if (!input || !icon) return;
      const visible  = input.type === 'text';
      input.type     = visible ? 'password' : 'text';
      icon.className = visible ? 'bi bi-eye' : 'bi bi-eye-slash';
    });
  }

  // ─── Schedule display generator ─────────────────────────────
  // Watches the day checkboxes and time pickers and builds
  // the human-readable schedule string in real time.
  // e.g. "MWF 07:30 AM – 09:00 AM"

  const dayCheckboxes   = document.querySelectorAll('.day-checkbox');
  const startTimeInput  = document.getElementById('schedule_start');
  const endTimeInput    = document.getElementById('schedule_end');
  const schedulePreview = document.getElementById('schedulePreview');

  function formatTime(val) {
    if (!val) return '';
    const [h, m]  = val.split(':').map(Number);
    const period  = h >= 12 ? 'PM' : 'AM';
    const hour    = h % 12 || 12;
    const minute  = String(m).padStart(2, '0');
    return `${hour}:${minute} ${period}`;
  }

  function buildScheduleString() {
    const dayMap = {
      Mon: 'M', Tue: 'T', Wed: 'W',
      Thu: 'Th', Fri: 'F', Sat: 'Sa'
    };

    const selectedDays = Array.from(dayCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => dayMap[cb.value] || cb.value)
      .join('');

    const start = formatTime(startTimeInput?.value);
    const end   = formatTime(endTimeInput?.value);

    if (!selectedDays && !start && !end) {
      return '';
    }

    let result = '';
    if (selectedDays) result += selectedDays;
    if (start)        result += (result ? ' ' : '') + start;
    if (start && end) result += ' – ' + end;

    return result;
  }

  function updateSchedulePreview() {
    if (!schedulePreview) return;
    const str = buildScheduleString();
    schedulePreview.textContent = str || '—';
  }

  if (dayCheckboxes.length > 0) {
    dayCheckboxes.forEach(cb => {
      cb.addEventListener('change', updateSchedulePreview);
    });
  }

  if (startTimeInput) {
    startTimeInput.addEventListener('change', updateSchedulePreview);
  }

  if (endTimeInput) {
    endTimeInput.addEventListener('change', updateSchedulePreview);
  }

  // Run once on page load to populate preview on edit page
  updateSchedulePreview();

});