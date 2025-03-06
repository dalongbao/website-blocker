// Initialization
chrome.runtime.onInstalled.addListener(function() {
  // Initialize storage with default values
  const defaultSites = [
    { url: "*://*.x.com/*", isBlocked: false },
    { url: "*://*.twitter.com/*", isBlocked: false }, // Add twitter.com as well
    { url: "*://*.instagram.com/*", isBlocked: false },
    { url: "*://*.reddit.com/*", isBlocked: false },
    { url: "*://*.youtube.com/*", isBlocked: false }
  ];
  
  chrome.storage.sync.get('blockedSites', function(data) {
    if (!data.blockedSites) {
      chrome.storage.sync.set({ blockedSites: defaultSites });
      console.log('Initialized with default sites');
    } else {
      // If we have saved rules, apply them immediately
      updateBlockRules(data.blockedSites);
      console.log('Loaded existing sites:', data.blockedSites.length);
    }
  });
});

// Listen for storage changes to update blocking rules
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.blockedSites) {
    updateBlockRules(changes.blockedSites.newValue);
    console.log('Sites updated in storage');
  }
});

// List of search engines and their query parameters
const searchEngines = [
  { domain: 'google', param: 'q' },
  { domain: 'bing', param: 'q' },
  { domain: 'yahoo', param: 'p' },
  { domain: 'duckduckgo', param: 'q' },
  { domain: 'yandex', param: 'text' },
  { domain: 'baidu', param: 'wd' }
];

// List of domain aliases (sites with multiple domains)
const domainAliases = {
  'x.com': ['twitter.com'],
  'twitter.com': ['x.com']
};

// Listen for all web requests
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
  // Only apply to main frame navigations (not iframes, etc.)
  if (details.frameId !== 0) return;
  
  chrome.storage.sync.get('blockedSites', function(data) {
    const blockedSites = data.blockedSites || [];
    let url;
    
    try {
      url = new URL(details.url);
    } catch (e) {
      console.error("Invalid URL:", details.url);
      return;
    }
    
    // Special case for x.com and twitter.com
    if (url.hostname === 'x.com' || url.hostname.endsWith('.x.com') || 
        url.hostname === 'twitter.com' || url.hostname.endsWith('.twitter.com')) {
      
      const xBlocked = blockedSites.find(site => 
        site.isBlocked && (site.url.includes('x.com') || site.url.includes('twitter.com'))
      );
      
      if (xBlocked) {
        chrome.tabs.update(details.tabId, {
          url: chrome.runtime.getURL('lilu.png')
        });
        console.log('Blocked X/Twitter navigation to:', url.hostname);
        return;
      }
    }
    
    // Check if the URL directly matches any enabled blocked sites
    const matchedSite = blockedSites.find(site => 
      site.isBlocked && matchesUrl(url, site.url)
    );
    
    if (matchedSite) {
      // Redirect to the lilu.png image
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL('lilu.png')
      });
      console.log('Blocked direct navigation to:', url.hostname);
      return;
    }
    
    // Check if this is a search query for a blocked site
    const searchEngine = searchEngines.find(engine => 
      url.hostname.includes(engine.domain)
    );
    
    if (searchEngine) {
      const searchQuery = url.searchParams.get(searchEngine.param);
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        
        // Check if the search query contains any blocked site names
        const matchedQuery = blockedSites.find(site => {
          if (!site.isBlocked) return false;
          
          // Extract domain name from site.url pattern
          let domainName = site.url;
          domainName = domainName.replace(/^\*:\/\/\*\./g, '').replace(/\/\*$/g, '');
          
          // Check main domain
          if (lowerQuery.includes(domainName)) return true;
          
          // Check aliases
          const aliases = domainAliases[domainName] || [];
          return aliases.some(alias => lowerQuery.includes(alias));
        });
        
        if (matchedQuery) {
          // Redirect to the lilu.png image
          chrome.tabs.update(details.tabId, {
            url: chrome.runtime.getURL('lilu.png')
          });
          console.log('Blocked search for:', lowerQuery);
        }
      }
    }
  });
});

// Helper function to check if a URL matches a pattern
function matchesUrl(url, pattern) {
  // Extract the domain part from the pattern
  let domainPart = pattern.replace(/^\*:\/\/\*\./g, '').replace(/\/\*$/g, '');
  
  // Check for aliases
  const aliases = domainAliases[domainPart] || [];
  
  // Check the main domain and all its aliases
  if (url.hostname === domainPart || url.hostname.endsWith('.' + domainPart)) {
    return true;
  }
  
  // Check all aliases
  for (const alias of aliases) {
    if (url.hostname === alias || url.hostname.endsWith('.' + alias)) {
      return true;
    }
  }
  
  // If no direct match, try regex matching for wildcard patterns
  if (pattern.includes('*://')) {
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/');
    return new RegExp('^' + regex + '$').test(url.href);
  }
  
  return false;
}

// Update the blocking rules based on stored sites
function updateBlockRules(sites) {
  if (!sites) return;
  
  // Expand sites list to include aliases
  const expandedSites = [];
  
  sites.forEach(site => {
    expandedSites.push(site);
    
    // Extract domain name
    const domainPart = site.url.replace(/^\*:\/\/\*\./g, '').replace(/\/\*$/g, '');
    
    // Add aliases if they exist
    const aliases = domainAliases[domainPart] || [];
    aliases.forEach(alias => {
      const aliasPattern = site.url.replace(domainPart, alias);
      expandedSites.push({
        url: aliasPattern,
        isBlocked: site.isBlocked
      });
    });
  });
  
  // Create rules for each blocked site
  const rules = expandedSites
    .filter(site => site.isBlocked)
    .map((site, index) => ({
      id: index + 1, // Rule IDs must be unique and positive
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { url: chrome.runtime.getURL('lilu.png') }
      },
      condition: {
        urlFilter: site.url,
        resourceTypes: ['main_frame']
      }
    }));
  
  // Update the dynamic rules
  try {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from({ length: 100 }, (_, i) => i + 1), // Remove existing rules (up to 100)
      addRules: rules
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error updating rules:', chrome.runtime.lastError);
      } else {
        console.log('Updated blocking rules:', rules.length, 'sites blocked');
      }
    });
  } catch (e) {
    console.error('Error in updateDynamicRules:', e);
  }
}
