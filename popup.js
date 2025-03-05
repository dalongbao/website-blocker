document.addEventListener('DOMContentLoaded', function() {
  const sitesList = document.getElementById('sites-list');
  const newSiteInput = document.getElementById('new-site');
  const addButton = document.getElementById('add-button');
  const statusDiv = document.getElementById('status');
  
  // Load blocked sites from storage
  function loadBlockedSites() {
    chrome.storage.sync.get('blockedSites', function(data) {
      const blockedSites = data.blockedSites || [];
      renderSitesList(blockedSites);
    });
  }
  
  // Render the list of sites with toggle switches
  function renderSitesList(sites) {
    sitesList.innerHTML = '';
    
    if (sites.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = 'No websites added yet. Add one below!';
      emptyMessage.style.color = '#666';
      sitesList.appendChild(emptyMessage);
      return;
    }
    
    sites.forEach(function(site, index) {
      const siteRow = document.createElement('div');
      siteRow.className = 'site-row';
      
      const siteName = document.createElement('div');
      siteName.className = 'site-name';
      siteName.textContent = site.url;
      
      const toggleSwitch = document.createElement('label');
      toggleSwitch.className = 'switch';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = site.enabled;
      checkbox.dataset.index = index;
      
      checkbox.addEventListener('change', function() {
        updateSiteStatus(index, this.checked);
        showStatus(site.url + ' ' + (this.checked ? 'blocked' : 'unblocked'));
      });
      
      const slider = document.createElement('span');
      slider.className = 'slider';
      
      const deleteBtn = document.createElement('span');
      deleteBtn.textContent = '×';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.style.color = '#999';
      deleteBtn.style.fontSize = '18px';
      deleteBtn.style.marginLeft = '8px';
      deleteBtn.title = 'Delete';
      
      deleteBtn.addEventListener('click', function() {
        deleteSite(index);
      });
      
      toggleSwitch.appendChild(checkbox);
      toggleSwitch.appendChild(slider);
      
      siteRow.appendChild(siteName);
      siteRow.appendChild(toggleSwitch);
      siteRow.appendChild(deleteBtn);
      
      sitesList.appendChild(siteRow);
    });
  }
  
  // Update the enabled status of a site
  function updateSiteStatus(index, enabled) {
    chrome.storage.sync.get('blockedSites', function(data) {
      const blockedSites = data.blockedSites || [];
      blockedSites[index].enabled = enabled;
      chrome.storage.sync.set({ blockedSites: blockedSites });
    });
  }
  
  // Delete a site from the list
  function deleteSite(index) {
    chrome.storage.sync.get('blockedSites', function(data) {
      const blockedSites = data.blockedSites || [];
      const url = blockedSites[index].url;
      blockedSites.splice(index, 1);
      chrome.storage.sync.set({ blockedSites: blockedSites }, function() {
        loadBlockedSites();
        showStatus(url + ' removed');
      });
    });
  }
  
  // Add a new site to block
  function addNewSite() {
    let url = newSiteInput.value.trim();
    
    if (!url) {
      showStatus('Please enter a valid URL');
      return;
    }
    
    // Clean up the URL (remove http://, https://, www., etc.)
    url = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
    
    // Remove trailing slash and everything after
    url = url.split('/')[0];
    
    chrome.storage.sync.get('blockedSites', function(data) {
      const blockedSites = data.blockedSites || [];
      
      // Check if site already exists
      const exists = blockedSites.some(site => site.url === url);
      
      if (exists) {
        showStatus(url + ' is already in your list');
        return;
      }
      
      blockedSites.push({ url: url, enabled: true });
      chrome.storage.sync.set({ blockedSites: blockedSites }, function() {
        loadBlockedSites();
        newSiteInput.value = '';
        showStatus(url + ' added and blocked');
      });
    });
  }
  
  // Show status message
  function showStatus(message) {
    statusDiv.textContent = message;
    setTimeout(() => {
      statusDiv.textContent = '';
    }, 3000);
  }
  
  // Event listeners
  addButton.addEventListener('click', addNewSite);
  newSiteInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      addNewSite();
    }
  });
  
  // Initial load
  loadBlockedSites();
});

// background.js
chrome.runtime.onInstalled.addListener(function() {
  // Initialize storage with default values
  const defaultSites = [
    { url: 'x.com', enabled: false },
    { url: 'instagram.com', enabled: false },
    { url: 'reddit.com', enabled: false },
    { url: 'youtube.com', enabled: false }
  ];
  
  chrome.storage.sync.get('blockedSites', function(data) {
    if (!data.blockedSites) {
      chrome.storage.sync.set({ blockedSites: defaultSites });
    }
  });
});

// Listen for navigation events
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
  // Only apply to main frame navigations (not iframes, etc.)
  if (details.frameId !== 0) return;
  
  chrome.storage.sync.get('blockedSites', function(data) {
    const blockedSites = data.blockedSites || [];
    const url = new URL(details.url);
    
    // Check if the URL matches any enabled blocked sites
    const matchedSite = blockedSites.find(site => 
      site.enabled && (url.hostname === site.url || url.hostname.endsWith('.' + site.url))
    );
    
    if (matchedSite) {
      // Redirect to the lilu.png image instead of blocked.html
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL('lilu.png')
      });
    }
  });
});
