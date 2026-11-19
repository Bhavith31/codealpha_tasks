const params = new URLSearchParams(location.search);
const next = params.get('next') === 'cart.html' ? 'cart.html' : 'index.html'; 

if (Auth.token){
  window.location.href = next;
} 

const forms = { login: document.getElementById('login-form'), register: document.getElementById('register-form') };

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
  forms.login.hidden = tab.dataset.tab !== 'login';
  forms.register.hidden = tab.dataset.tab !== 'register';
}));

function showError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.style.display = 'block';
}

async function submit(path, body, errorId) {
  try {
    const { token, user } = await api(path, { method: 'POST', body });
    Auth.save(token, user);
    window.location.href = next;
  } catch (err) {
    showError(errorId, err.message);
  }
}

forms.login.addEventListener('submit', (e) => {
  e.preventDefault();
  submit('/auth/login', {
    email: document.getElementById('l-email').value,
    password: document.getElementById('l-password').value,
  }, 'login-error');
});

forms.register.addEventListener('submit', (e) => {
  e.preventDefault();
  submit('/auth/register', {
    name: document.getElementById('r-name').value,
    email: document.getElementById('r-email').value,
    password: document.getElementById('r-password').value,
  }, 'register-error');
});
