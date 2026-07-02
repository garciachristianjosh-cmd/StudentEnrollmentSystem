// public/js/main.js

document.addEventListener('DOMContentLoaded', function () {

  // ─── 1. Bootstrap Form Validation ──────────────────────────
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
  const strengthBar  = document.getElementById('passwordStrengthBar');
  const strengthText = document.getElementById('passwordStrengthText');

  function getStrength(val) {
    let score = 0;
    if (val.length >= 8)           score++;
    if (val.length >= 12)          score++;
    if (/[A-Z]/.test(val))         score++;
    if (/[0-9]/.test(val))         score++;
    if (/[^A-Za-z0-9]/.test(val))  score++;
    return score;
  }

  if (newPassword && strengthBar) {
    newPassword.addEventListener('input', function () {
      const val    = newPassword.value;
      const score  = getStrength(val);
      const levels = [
        { label: '',             color: '',           width: '0%'   },
        { label: 'Very Weak',    color: 'bg-danger',  width: '20%'  },
        { label: 'Weak',         color: 'bg-warning', width: '40%'  },
        { label: 'Fair',         color: 'bg-info',    width: '60%'  },
        { label: 'Strong',       color: 'bg-primary', width: '80%'  },
        { label: 'Very Strong',  color: 'bg-success', width: '100%' }
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
    let result  = '';
    if (selectedDays) result += selectedDays;
    if (start)        result += (result ? ' ' : '') + start;
    if (start && end) result += ' – ' + end;
    return result;
  }

  function updateSchedulePreview() {
    if (!schedulePreview) return;
    schedulePreview.textContent = buildScheduleString() || '—';
  }

  dayCheckboxes.forEach(cb => cb.addEventListener('change', updateSchedulePreview));
  if (startTimeInput) startTimeInput.addEventListener('change', updateSchedulePreview);
  if (endTimeInput)   endTimeInput.addEventListener('change', updateSchedulePreview);
  updateSchedulePreview();

  // ─── 6. Print buttons ───────────────────────────────────────
  const printReportBtn   = document.getElementById('printReportBtn');
  const printScheduleBtn = document.getElementById('printScheduleBtn');

  if (printReportBtn) {
    printReportBtn.addEventListener('click', function () { window.print(); });
  }
  if (printScheduleBtn) {
    printScheduleBtn.addEventListener('click', function () { window.print(); });
  }

  // ─── 7. Progress bar width from data attribute ───────────────
  const progressBar = document.getElementById('unitProgressBar');
  if (progressBar) {
    progressBar.style.width =
      progressBar.getAttribute('data-width') + '%';
  }

  // ─── 8. Schedule card accent colors ─────────────────────────
  document.querySelectorAll('.schedule-card[data-color]').forEach(function (card) {
    const color = card.getAttribute('data-color');
    if (!color) return;
    card.style.borderLeftColor = color;
    const codeEl = card.querySelector('.card-accent-text');
    if (codeEl) codeEl.style.color = color;
    card.querySelectorAll('.card-accent-icon').forEach(function (icon) {
      icon.style.color = color;
    });
    const badge = card.querySelector('.card-accent-badge');
    if (badge) {
      badge.style.backgroundColor = color + '22';
      badge.style.color           = color;
    }
  });

  // ─── 9. Delete confirmation modal ───────────────────────────
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-delete-id]');
    if (!btn) return;
    e.preventDefault();

    const name   = btn.getAttribute('data-delete-name');
    const action = btn.getAttribute('data-delete-action');
    const label  = btn.getAttribute('data-delete-label') || 'item';

    const modal   = document.getElementById('deleteModal');
    const nameEl  = document.getElementById('deleteItemName');
    const labelEl = document.getElementById('deleteItemLabel');
    const form    = document.getElementById('deleteForm');

    if (!modal || !form) return;

    if (nameEl)  nameEl.textContent  = name;
    if (labelEl) labelEl.textContent = label;
    form.action = action;

    new bootstrap.Modal(modal).show();
  });

  // ─── 10. Session timeout warning ────────────────────────────
  // Warns the user 5 minutes before the 2-hour session expires
  const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in ms
  const WARNING_BEFORE   = 5 * 60 * 1000;       // warn 5 min before
  const warningTime      = SESSION_DURATION - WARNING_BEFORE;

  setTimeout(function () {
    // Only show if the user is still on the page
    const existing = document.getElementById('sessionWarningToast');
    if (existing) return;

    const toast = document.createElement('div');
    toast.id    = 'sessionWarningToast';
    toast.innerHTML = `
      <div style="
        position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;
        background:#1e2a3a;color:#fff;padding:1rem 1.25rem;
        border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.3);
        max-width:320px;font-size:0.875rem;
      ">
        <div style="font-weight:600;margin-bottom:0.35rem;">
          <i class="bi bi-clock" style="color:#f59e0b;margin-right:0.4rem;"></i>
          Session Expiring Soon
        </div>
        <div style="color:rgba(255,255,255,0.75);">
          Your session will expire in 5 minutes.
          Save your work and refresh the page to stay logged in.
        </div>
        <div style="margin-top:0.75rem;display:flex;gap:0.5rem;">
          <a href="/"
             style="background:#3b82f6;color:#fff;padding:0.35rem 0.85rem;
                    border-radius:6px;text-decoration:none;font-size:0.8rem;">
            Stay Logged In
          </a>
          <button onclick="this.closest('#sessionWarningToast').remove()"
                  style="background:rgba(255,255,255,0.1);color:#fff;
                         border:none;padding:0.35rem 0.85rem;
                         border-radius:6px;font-size:0.8rem;cursor:pointer;">
            Dismiss
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(toast);
  }, warningTime);

  // ─── 11. Auto-dismiss flash alerts ──────────────────────────
  // Success alerts auto-dismiss after 4 seconds
  document.querySelectorAll('.alert-success').forEach(function (alert) {
    setTimeout(function () {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      if (bsAlert) bsAlert.close();
    }, 4000);
  });

});