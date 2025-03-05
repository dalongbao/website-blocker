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
