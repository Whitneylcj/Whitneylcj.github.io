(function () {
  const body = document.body;
  const toggle = document.getElementById('themeToggle');
  const saved = localStorage.getItem('site-theme');
  if (saved === 'light') body.classList.add('light');

  if (toggle) {
    toggle.addEventListener('click', () => {
      body.classList.toggle('light');
      localStorage.setItem('site-theme', body.classList.contains('light') ? 'light' : 'dark');
    });
  }
})();
