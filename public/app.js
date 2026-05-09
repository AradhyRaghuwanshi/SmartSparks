document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const logoutButton = document.getElementById('logoutButton');
  const saveLcdTextButton = document.getElementById('saveLcdTextButton');
  const lcdText = document.getElementById('lcdText');
  const sensorRecords = document.getElementById('sensorRecords');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (response.ok) {
        window.location.href = 'dashboard.html';
      } else {
        alert('Login failed');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      if (response.ok) {
        window.location.href = 'index.html';
      } else {
        alert('Registration failed');
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await fetch('/logout');
      window.location.href = 'index.html';
    });
  }

  if (saveLcdTextButton) {
    saveLcdTextButton.addEventListener('click', async () => {
      const text = lcdText.value;
      const response = await fetch('/save-lcd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (response.ok) {
        alert('Text saved to LCD');
      } else {
        alert('Failed to save text');
      }
    });
  }

  if (sensorRecords) {
    const loadRecords = async () => {
      const response = await fetch('/all-records');
      const records = await response.json();
      sensorRecords.innerHTML = records.map((record, index) => `
        <tr>
          <td class="border border-gray-300 px-4 py-2">${index + 1}</td>
          <td class="border border-gray-300 px-4 py-2">${record.temperature} °C</td>
          <td class="border border-gray-300 px-4 py-2">${record.humidity} %</td>
          <td class="border border-gray-300 px-4 py-2">${record.time}</td>
          <td class="border border-gray-300 px-4 py-2">${record.date}</td>
          <td class="border border-gray-300 px-4 py-2">
            <button class="bg-red-500 text-white px-2 py-1 rounded" onclick="deleteRecord(${record.id})">Delete</button>
          </td>
        </tr>
      `).join('');
    };

    const deleteRecord = async (id) => {
      const response = await fetch(`/delete-record/${id}`, { method: 'DELETE' });
      if (response.ok) {
        loadRecords();
      } else {
        alert('Failed to delete record');
      }
    };

    window.deleteRecord = deleteRecord;
    loadRecords();
  }
});