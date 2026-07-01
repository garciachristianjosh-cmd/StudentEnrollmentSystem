// public/js/main.js

document.addEventListener('DOMContentLoaded', function () {

  // ─── 1. Bootstrap Form Validation ──────────────────────────
  // Applies to every form with the class "needs-validation"
  // Prevents submit if any field is invalid and shows
  // Bootstrap's built-in validation styles.
  const forms = document.querySelectorAll('form.needs-validation');
  forms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });

  // ─── 2. Password match validation ──────────────────────────
  // Checks confirm_password matches new_password in real time
  // and sets a custom validity message so Bootstrap styles apply.
  const newPassword     = document.getElementById('new_password');
  const confirmPassword = document.getElementById('confirm_password');

  function checkPasswordMatch() {
    if (!newPassword || !confirmPassword) return;
    if (confirmPassword.value && newPassword.value !== confirmPassword.value) {
      confirmPassword.setCustomValidity('Passwords do not match.');
    } else {
      confirmPassword.setCustomValidity('');
    }
  }

  if (newPassword)     newPassword.addEventListener('input', checkPasswordMatch);
  if (confirmPassword) confirmPassword.addEventListener('input', checkPasswordMatch);

  // ─── 3. Password strength indicator ────────────────────────
  // Shows a live strength bar under the new_password field.
  const strengthBar  = document.getElementById('passwordStrengthBar');
  const strengthText = document.getElementById('passwordStrengthText');

  function getStrength(val) {
    let score = 0;
    if (val.length >= 8)            score++;
    if (val.length >= 12)           score++;
    if (/[A-Z]/.test(val))          score++;
    if (/[0-9]/.test(val))          score++;
    if (/[^A-Za-z0-9]/.test(val))   score++;
    return score;
  }

  if (newPassword && strengthBar) {
    newPassword.addEventListener('input', function () {
      const val    = newPassword.value;
      const score  = getStrength(val);
      const levels = [
        { label: '',          color: '',              width: '0%'   },
        { label: 'Very Weak', color: 'bg-danger',     width: '20%'  },
        { label: 'Weak',      color: 'bg-warning',    width: '40%'  },
        { label: 'Fair',      color: 'bg-info',       width: '60%'  },
        { label: 'Strong',    color: 'bg-primary',    width: '80%'  },
        { label: 'Very Strong', color: 'bg-success',  width: '100%' }
      ];
      const level = levels[Math.min(score, 5)];

      strengthBar.style.width = level.width;
      strengthBar.className   = 'progress-bar ' + level.color;
      if (strengthText) strengthText.textContent = level.label;
    });
  }

  // ─── 4. Toggle password visibility ─────────────────────────
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

  // ─── 5. Schedule display generator ─────────────────────────
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

  dayCheckboxes.forEach(cb => cb.addEventListener('change', updateSchedulePreview));
  if (startTimeInput) startTimeInput.addEventListener('change', updateSchedulePreview);
  if (endTimeInput)   endTimeInput.addEventListener('change', updateSchedulePreview);
  updateSchedulePreview();

  // ─── 6. Print button ────────────────────────────────────────
  const printBtn = document.getElementById('printReportBtn');
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      window.print();
    });
  }

  // ─── 7. Progress bar width from data attribute ───────────────
  const progressBar = document.getElementById('unitProgressBar');
  if (progressBar) {
    progressBar.style.width = progressBar.getAttribute('data-width') + '%';
  }

});