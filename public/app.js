document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const logoutButton = document.getElementById('logoutButton');
  const saveLcdTextButton = document.getElementById('saveLcdTextButton');
  const lcdText = document.getElementById('lcdText');
  const sensorRecords = document.getElementById('sensorRecords');
  const latestTemperature = document.getElementById('latestTemperature');
  const latestHumidity = document.getElementById('latestHumidity');
  const latestDateTime = document.getElementById('latestDateTime');

  // Login
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
        alert('Login failed. Check your credentials.');
      }
    });
  }

  // Register
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
        alert('Registration successful! Please login.');
        window.location.href = 'index.html';
      } else {
        alert('Registration failed. Email may already be in use.');
      }
    });
  }

  // Logout
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      await fetch('/logout');
      window.location.href = 'index.html';
    });
  }

  // LCD Save
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

  // Dashboard - Latest Data
  const loadLatestData = async () => {
    try {
      const response = await fetch('/latest-data');
      if (response.ok) {
        const data = await response.json();
        if (latestTemperature) latestTemperature.textContent = data.temperature + ' °C';
        if (latestHumidity) latestHumidity.textContent = data.humidity + ' %';
        if (latestDateTime) latestDateTime.textContent = data.date + ' ' + data.time;
      } else {
        if (latestTemperature) latestTemperature.textContent = 'No data yet';
        if (latestHumidity) latestHumidity.textContent = 'No data yet';
        if (latestDateTime) latestDateTime.textContent = 'Waiting for sensor...';
      }
    } catch (err) {
      console.error('Error fetching latest data:', err);
    }
  };

  // Dashboard - All Records
  const loadRecords = async () => {
    try {
      const response = await fetch('/all-records');
      const records = await response.json();

      if (!sensorRecords) return;

      if (records.length === 0) {
        sensorRecords.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4 text-gray-500">
              No sensor data yet. Waiting for Arduino/sensor to send data...
            </td>
          </tr>`;
        return;
      }

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
    } catch (err) {
      console.error('Error fetching records:', err);
    }
  };

  const deleteRecord = async (id) => {
    const response = await fetch(`/delete-record/${id}`, { method: 'DELETE' });
    if (response.ok) {
      loadRecords();
      loadLatestData();
    } else {
      alert('Failed to delete record');
    }
  };

  window.deleteRecord = deleteRecord;

  // Load dashboard data if on dashboard page
  if (sensorRecords || latestTemperature) {
    loadLatestData();
    loadRecords();

    // Auto-refresh every 10 seconds
    setInterval(() => {
      loadLatestData();
      loadRecords();
    }, 10000);
  }
}); 