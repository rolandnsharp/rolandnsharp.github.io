const themeSwitcher = document.getElementById('theme-switcher');
const body = document.body;

const savedTheme = localStorage.getItem('theme');

function updateIcon(theme) {
  themeSwitcher.textContent = theme === 'light' ? '🌙' : '☀️';
}

if (savedTheme) {
  body.className = savedTheme;
  updateIcon(savedTheme);
} else {
  updateIcon('dark'); // Default to dark
}

themeSwitcher.addEventListener('click', () => {
  let newTheme;
  if (body.classList.contains('dark')) {
    body.classList.remove('dark');
    body.classList.add('light');
    newTheme = 'light';
  } else {
    body.classList.remove('light');
    body.classList.add('dark');
    newTheme = 'dark';
  }
  localStorage.setItem('theme', newTheme);
  updateIcon(newTheme);
});
