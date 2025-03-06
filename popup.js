// Global variables
let timerInterval;
let timerSeconds = 0;

// Load sites from storage when popup opens
function loadSites() {
  chrome.storage.sync.get(['blockedSites'], function(result) {
    const sites = result.blockedSites || [];
    
    // Clear current list
    document.getElementById('sites-list').innerHTML = '';
    
    // Add each site to the UI
    sites.forEach(site => {
      addSiteToUI(site.url, site.isBlocked);
    });
    
    // Update site count
    updateSiteCount();
  });
}

// Save sites to storage
function saveSites() {
  const sites = [];
  const siteRows = document.querySelectorAll('.site-row');
  
  siteRows.forEach(row => {
    const url = row.dataset.site;
    const isBlocked = row.querySelector('.toggle-switch').checked;
    sites.push({ url, isBlocked });
  });
  
  chrome.storage.sync.set({ 'blockedSites': sites }, function() {
    console.log('Site settings saved');
  });
}

// Function to start/reset timer
function startTimer() {
  clearInterval(timerInterval);
  timerSeconds = 0;
  updateTimerDisplay();
  
  timerInterval = setInterval(function() {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

// Update timer display
function updateTimerDisplay() {
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  document.getElementById('timer').textContent = 
    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Update digital clock
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('clock').textContent = `${hours}:${minutes}:${seconds}`;
}

// Update site count in status
function updateSiteCount() {
  const siteCount = document.querySelectorAll('.site-row').length;
  document.getElementById('status').textContent = 
    `SYSTEM ACTIVE - ${siteCount} SITES MONITORED`;
}

// Format URL for proper site blocking
function formatUrlForBlocking(url) {
  // If it already has a wildcard or protocol, leave it as is
  if (url.includes('*') || url.includes('://')) {
    return url;
  }
  
  // Otherwise, make it a proper wildcard pattern
  return `*://*.${url}/*`;
}

// Add a site to UI (doesn't save to storage)
function addSiteToUI(siteName, isBlocked = true) {
  const sitesList = document.getElementById('sites-list');
  
  // Display a cleaner version for the UI
  const displayName = siteName.replace(/^\*:\/\/\*\./g, '').replace(/\/\*$/g, '');
    
  // Create elements
  const newRow = document.createElement('div');
  newRow.className = 'site-row';
  newRow.dataset.site = siteName;
  
  const siteNameDiv = document.createElement('div');
  siteNameDiv.className = 'site-name';
  siteNameDiv.textContent = displayName;
  
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'status-indicator';
  
  const statusLed = document.createElement('div');
  statusLed.className = isBlocked ? 'status-led red' : 'status-led green';
  
  const statusText = document.createElement('div');
  statusText.className = 'status-text';
  statusText.textContent = isBlocked ? 'BLOCKED' : 'ALLOWED';
  
  const switchLabel = document.createElement('label');
  switchLabel.className = 'switch';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isBlocked;
  checkbox.className = 'toggle-switch';
  checkbox.addEventListener('change', toggleSiteStatus);
  
  const sliderSpan = document.createElement('span');
  sliderSpan.className = 'slider';
  
  // Create delete button
  const deleteBtn = document.createElement('div');
  deleteBtn.className = 'delete-btn';
  deleteBtn.addEventListener('click', deleteSite);
  
  // Assemble the elements
  switchLabel.appendChild(checkbox);
  switchLabel.appendChild(sliderSpan);
  
  statusIndicator.appendChild(statusLed);
  statusIndicator.appendChild(statusText);
  statusIndicator.appendChild(switchLabel);
  statusIndicator.appendChild(deleteBtn);
  
  newRow.appendChild(siteNameDiv);
  newRow.appendChild(statusIndicator);
  
  sitesList.appendChild(newRow);
}

// Delete a site
function deleteSite(event) {
  // Get the closest parent element with class 'site-row'
  const siteRow = event.target.closest('.site-row');
  if (siteRow) {
    // Reset timer when deleting a site
    startTimer();
    
    // Remove the row
    siteRow.remove();
    
    // Update the site count
    updateSiteCount();
    
    // Save changes
    saveSites();
  }
}

// Add a new site
function addNewSite() {
  const newSiteInput = document.getElementById('new-site');
  let siteName = newSiteInput.value.trim();
  
  if (siteName) {
    // Format the URL for blocking
    siteName = formatUrlForBlocking(siteName);
    
    // Reset timer when adding a site
    startTimer();
    
    // Add to UI
    addSiteToUI(siteName, true);
    
    // Clear input
    newSiteInput.value = '';
    
    // Update site count
    updateSiteCount();
    
    // Save changes
    saveSites();
  }
}

// Toggle site status (blocked/allowed)
function toggleSiteStatus(event) {
  // Reset timer when toggling
  startTimer();
  
  const checkbox = event.target;
  const statusIndicator = checkbox.closest('.status-indicator');
  
  const statusLed = statusIndicator.querySelector('.status-led');
  const statusText = statusIndicator.querySelector('.status-text');
  
  if (checkbox.checked) {
    statusLed.className = 'status-led red';
    statusText.textContent = 'BLOCKED';
  } else {
    statusLed.className = 'status-led green';
    statusText.textContent = 'ALLOWED';
  }
  
  // Save changes
  saveSites();
}

// Initialize when page is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Load saved sites
  loadSites();
  
  // Start timer
  startTimer();
  
  // Initialize clock and set update interval
  updateClock();
  setInterval(updateClock, 1000);
  
  // Add button click event
  document.getElementById('add-button').addEventListener('click', addNewSite);
  
  // Add event listener for Enter key in input
  document.getElementById('new-site').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addNewSite();
    }
  });
});
