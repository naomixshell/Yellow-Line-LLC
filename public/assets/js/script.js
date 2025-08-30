// Bootstrap validation helper
(function () {
  const forms = document.querySelectorAll('.needs-validation');
  Array.from(forms).forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (!form.checkValidity()) { event.preventDefault(); event.stopPropagation(); }
      form.classList.add('was-validated');
    }, false);
  });
})();

// CONTACT → POST /api/inquiries
const inquiryForm = document.getElementById('inquiryForm');
if (inquiryForm) {
  inquiryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!inquiryForm.checkValidity()) return;

    const spinner = document.getElementById('inqSpinner');
    const alertBox = document.getElementById('inqAlert');
    spinner.classList.remove('d-none'); alertBox.classList.add('d-none');

    const formData = Object.fromEntries(new FormData(inquiryForm).entries());

    // Honeypot
    if (formData.company) { spinner.classList.add('d-none'); return; }

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(formData)
      });
      const out = await res.json();
      spinner.classList.add('d-none');
      alertBox.classList.remove('d-none');
      alertBox.className = 'alert alert-success';
      alertBox.textContent = out.message || 'Thanks! We will contact you.';
      inquiryForm.reset();
      inquiryForm.classList.remove('was-validated');
    } catch(err) {
      spinner.classList.add('d-none');
      alertBox.classList.remove('d-none');
      alertBox.className = 'alert alert-danger';
      alertBox.textContent = 'Submission failed. Please try again.';
    }
  });
}

// CAREERS → POST /api/applications (multipart)
const jobForm = document.getElementById('jobApplicationForm');
if (jobForm) {
  jobForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!jobForm.checkValidity()) return;

    const spinner = document.getElementById('jobSpinner');
    const alertBox = document.getElementById('jobAlert');
    spinner.classList.remove('d-none'); alertBox.classList.add('d-none');

    const fd = new FormData(jobForm);
    try {
      const res = await fetch('/api/applications', { method:'POST', body: fd });
      const out = await res.json();
      spinner.classList.add('d-none');
      alertBox.classList.remove('d-none');
      alertBox.className = 'alert alert-success';
      alertBox.textContent = out.message || 'Application received. Thank you!';
      jobForm.reset();
      jobForm.classList.remove('was-validated');
    } catch(err) {
      spinner.classList.add('d-none');
      alertBox.classList.remove('d-none');
      alertBox.className = 'alert alert-danger';
      alertBox.textContent = 'Upload failed. Please try again.';
    }
  });
}
