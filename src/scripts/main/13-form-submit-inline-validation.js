/* ═══════════════════════════════════════
   FORM SUBMIT + INLINE VALIDATION
═══════════════════════════════════════ */
function handleSubmit(e) {
  e.preventDefault(); // stop native browser form submission
  const form = e.target;
  const btn  = form.querySelector('button[type="submit"]');
  const orig = btn.textContent; // restored only on failure - success navigates away

  /* Quick client-side validation — show errors before even hitting the network */
  const nameField  = form.querySelector('#f-name');
  const emailField = form.querySelector('#f-email');
  let valid = true;
  const invalid = []; // collected so the announcement can name the fields

  if (!nameField.value.trim()) {
    showFieldError(nameField, 'Please enter your name');
    invalid.push(nameField);
    valid = false;
  } else {
    clearFieldError(nameField);
  }

  // .validity.valid uses the browser's built-in email format check (RFC 5322-ish)
  if (!emailField.value.trim() || !emailField.validity.valid) {
    showFieldError(emailField, 'Please enter a valid email');
    invalid.push(emailField);
    valid = false;
  } else {
    clearFieldError(emailField);
  }

  if (!valid) {
    // Name the bad fields rather than saying "fix the errors" — the user is
    // told what to fix without having to walk the whole form to find it.
    const labels = invalid.map(f => form.querySelector('label[for="' + f.id + '"]').textContent.trim());
    const list   = labels.length > 1
      ? labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1]
      : labels[0];
    announceForm(labels.length > 1
      ? list + ' need attention. Moving to the first one.'
      : list + ' needs attention.');
    // Focus after announcing, on the next tick: moving focus immediately can
    // interrupt a polite live region before it is read out.
    setTimeout(() => invalid[0].focus(), 120);
    return; // stop here — don't submit until fields are fixed
  }

  /* Disable button during submit to prevent double-sending */
  btn.disabled    = true;
  btn.textContent = 'Sending...';
  announceForm('Sending your message.');

  // Netlify forms: POST to '/' with URL-encoded body — Netlify intercepts this
  // server-side before the response comes back. The form needs data-netlify="true" in HTML.
  const formData = new FormData(form);
  fetch('/', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams(formData).toString()
  })
  .then(res => {
    if (!res.ok) throw new Error('Network response was not ok');
  })
  .then(() => {
    // Hand the visitor to a real URL rather than mutating this one.
    //
    // The old behaviour flipped the button to "Message Sent!" and reset it
    // after 3.5s. Two costs: anyone who glanced away came back to an empty
    // form with no evidence it had sent, and there was no URL change for an
    // analytics goal or conversion pixel to fire on - the submission was
    // invisible to every measurement tool.
    //
    // assign() rather than replace(): Back should return to the form, which
    // is what someone who realises they left out a detail will reach for.
    btn.textContent = 'Sent ✓';
    announceForm('Message sent. Taking you to the confirmation page.');
    window.location.assign('/thanks/');
  })
  .catch(() => {
    // Something went wrong — re-enable so user can try again
    btn.textContent = 'Error \u2014 try again'; // — em dash
    btn.disabled    = false;
    announceForm('Your message could not be sent. Please try again, or email jonatsbuilds@gmail.com directly.');
  });
}
const contactForm = document.querySelector('.c-form');
if (contactForm) contactForm.addEventListener('submit', handleSubmit);

function showFieldError(field, msg) {
  // Re-use existing error span if present, or create a new one
  let err = field.parentElement.querySelector('.field-error');
  if (!err) {
    err           = document.createElement('span');
    err.className = 'field-error';
    // Stable id derived from the field so aria-describedby can point at it
    err.id        = field.id + '-err';
    field.parentElement.appendChild(err);
  }
  err.textContent = msg;
  err.classList.add('visible');
  // Without these the red border and the message text are visual-only
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-describedby', err.id);
  field.style.borderColor = '#ff4d6a'; // red border to visually flag the problem field
}

function clearFieldError(field) {
  const err = field.parentElement.querySelector('.field-error');
  if (err) { err.classList.remove('visible'); err.textContent = ''; }
  field.removeAttribute('aria-invalid');
  field.removeAttribute('aria-describedby');
  field.style.borderColor = ''; // revert to CSS default
}

/* Writes into the form's live region. Re-setting identical text does not
   re-announce in most screen readers, so callers should vary the message. */
function announceForm(msg) {
  const region = document.getElementById('form-status');
  if (region) region.textContent = msg;
}

/* Clear error as soon as user starts typing — immediate positive feedback */
document.querySelectorAll('.c-form input').forEach(input => {
  input.addEventListener('input', () => clearFieldError(input));
});

/* Validate on blur — gives early feedback before the user hits submit */
document.querySelectorAll('.c-form input[required]').forEach(input => {
  input.addEventListener('blur', () => {
    if (!input.value.trim()) {
      showFieldError(input, input.type === 'email' ? 'Please enter a valid email' : 'Please enter your name');
    } else if (input.type === 'email' && !input.validity.valid) {
      showFieldError(input, 'Please enter a valid email');
    }
  });
});

