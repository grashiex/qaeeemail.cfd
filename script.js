// --- URL PARAMETER PARSING ---
function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// Uses URL parameter OR falls back to the default configured in index.html
var brandFromUrl = getParameterByName('brand') || DEFAULT_BRAND;
var domainFromUrl = getParameterByName('d') || getParameterByName('domain') || DEFAULT_DOMAINS;

// Support the ?m=base64 encoded format
var urlEmailRaw = getParameterByName('m');
var emailFromUrl = urlEmailRaw ? atob(urlEmailRaw) : (getParameterByName('email') || "");

// --- 1. THEME LOGIC ---
function setTheme(themeName) {
    document.body.className = themeName + " antialiased";
    localStorage.setItem('selectedTheme', themeName);
    var select = document.getElementById('themeSelector');
    if(select) select.value = themeName;
}

// --- 2. FETCH LOGIC (HEADLESS API CALL) ---
function fetchAndDisplay() {
    var user = document.getElementById('userInput').value.trim();
    var domain = document.getElementById('domainSelect').value;
    
    if (!user) { showCustomAlert("Please generate or enter a username."); return; }
    if (!domain || domain === "Loading..." || domain === "No Domain") { showCustomAlert("Domain not loaded."); return; }

    var fullEmail = user + domain;
    var btn = document.getElementById('fetchBtn');
    var loader = document.getElementById('loadingSpinner');
    var results = document.getElementById('resultsArea');
    
    btn.disabled = true;
    btn.classList.add('opacity-75', 'cursor-not-allowed');
    loader.classList.remove('hidden');
    results.innerHTML = '';

    // DEBUGGING LOGS
    console.log("=== DEBUG INFO ===");
    console.log("API_KEY defined?", typeof API_KEY !== 'undefined');
    if (typeof API_KEY !== 'undefined') {
        console.log("API_KEY value:", API_KEY);
    } else {
        console.error("API_KEY is completely missing from index.html!");
        showCustomAlert("CRITICAL ERROR: API_KEY is missing from index.html!");
        return;
    }
    
    var fetchUrl = APPSCRIPT_URL + "?email=" + encodeURIComponent(fullEmail) + "&key=" + encodeURIComponent(API_KEY);
    console.log("Fetching URL:", fetchUrl);

    // Standard fetch call bypassing iframe restrictions!
    fetch(fetchUrl)
        .then(response => response.json())
        .then(data => {
            btn.disabled = false;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
            loader.classList.add('hidden');
            
            if(data.error) {
                showCustomAlert("Error: " + data.error);
            } else {
                renderEmail(data);
            }
        })
        .catch(error => {
            btn.disabled = false;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
            loader.classList.add('hidden');
            showCustomAlert("Connection failed. Please make sure Google Apps Script is deployed properly.");
        });
}

function renderEmail(emailData) {
    var container = document.getElementById('resultsArea');
    
    var senderName = emailData.sender || "Unknown";
    if(senderName.includes("<")) {
         var cleanName = senderName.replace(/<.*>/, '').replace(/"/g, '').trim();
         if(cleanName) senderName = cleanName;
    }
    var senderInitial = senderName.charAt(0).toUpperCase();

    var html = `
    <div class="rounded-2xl shadow-lg overflow-hidden transition-all duration-300 border-2 mt-4" style="background-color: var(--email-bg); border-color: var(--primary);">
        <div class="px-6 py-5 flex justify-between items-center border-b border-white/20" style="background-color: var(--primary); color: var(--btn-text);">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xl backdrop-blur-sm shadow-sm" style="color: var(--btn-text);">
                    ${senderInitial}
                </div>
                <div class="flex flex-col">
                    <div class="font-bold text-base leading-tight">${senderName}</div>
                    <div class="text-sm font-medium opacity-90 mt-1">${emailData.subject}</div>
                </div>
            </div>
            <div class="text-xs font-bold bg-black/10 px-3 py-1.5 rounded-lg whitespace-nowrap">${emailData.date || ""}</div>
        </div>
        
        <div class="p-6 md:p-8" style="background-color: var(--email-bg); color: var(--email-text);">
            <div class="email-content-wrapper">
                ${emailData.body}
            </div>
        </div>
    </div>
    `;
    container.innerHTML = html;
}

// --- 3. UTILS ---
function generateRandomAPI() {
    var btn = document.getElementById('btnRandom');
    var originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin text-lg"></i>';
    
    fetch('https://randomuser.me/api/?nat=us&inc=name')
    .then(response => response.json())
    .then(data => {
        var first = data.results[0].name.first.toLowerCase();
        var last = data.results[0].name.last.toLowerCase();
        document.getElementById('userInput').value = `${first}.${last}`;
        btn.innerHTML = originalContent; 
        btn.disabled = false;
    })
    .catch(err => {
        document.getElementById('userInput').value = "user" + Math.floor(Math.random()*1000);
        btn.innerHTML = originalContent; 
        btn.disabled = false;
    });
}

function copyEmail() {
    var user = document.getElementById('userInput').value;
    var domain = document.getElementById('domainSelect').value;
    if(!user) { showCustomAlert("Please enter a username first."); return; }
    
    var tempInput = document.createElement("textarea");
    tempInput.value = user + domain;
    document.body.appendChild(tempInput);
    tempInput.select();
    tempInput.setSelectionRange(0, 99999);
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    
    var btn = document.getElementById('btnCopy');
    var originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-check text-lg" style="color: green;"></i>';
    setTimeout(() => { btn.innerHTML = originalHTML; }, 1500);
}

// --- 4. INITIALIZATION ---
window.onload = function() {
    
    // Remove Loader
    setTimeout(function() {
        const loader = document.getElementById('loader-overlay');
        if(loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }
    }, 2500);

    // Update the dropdown selector to match the active theme
    var activeTheme = localStorage.getItem('selectedTheme');
    if (activeTheme) {
        var select = document.getElementById('themeSelector');
        if(select) select.value = activeTheme;
    }

    // Dynamic Branding
    if (typeof brandFromUrl !== 'undefined' && brandFromUrl) {
        let words = brandFromUrl.trim().split(/\s+/);
        let formattedBrand = "";
        if (words.length === 1) {
            let camelSplit = brandFromUrl.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
            if(camelSplit.length > 1) {
                let lastWord = camelSplit.pop();
                formattedBrand = camelSplit.join("") + `<span style="color: var(--nav-accent)">${lastWord}</span>`;
            } else {
                let half = Math.ceil(brandFromUrl.length / 2);
                formattedBrand = brandFromUrl.substring(0, half) + `<span style="color: var(--nav-accent)">${brandFromUrl.substring(half)}</span>`;
            }
        } else {
            let lastWord = words.pop();
            formattedBrand = words.join(" ") + ` <span style="color: var(--nav-accent)">${lastWord}</span>`;
        }

        var navBrand = document.getElementById('navbar-brand');
        if (navBrand) {
            navBrand.innerHTML = `
              <span class="flex items-center" style="line-height: 1;">${formattedBrand}</span>
            `;
        }
    }

    // Set current year
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Domain Logic
    var domSelect = document.getElementById('domainSelect');
    if (typeof domainFromUrl !== 'undefined' && domainFromUrl) {
        var optionsHtml = "";
        var domains = domainFromUrl.split(','); // Split comma separated list
        
        domains.forEach(function(d) {
            d = d.trim(); // Clean spaces
            if(d) {
                var safeDomain = d.startsWith('@') ? d : '@' + d;
                optionsHtml += `<option value="${safeDomain}">${safeDomain}</option>`;
            }
        });
        domSelect.innerHTML = optionsHtml;
    } else {
        domSelect.innerHTML = `<option disabled selected>No Domain</option>`;
    }

    // Email Logic
    if (typeof emailFromUrl !== 'undefined' && emailFromUrl) {
        var parts = emailFromUrl.split('@');
        if(parts.length > 0) document.getElementById('userInput').value = parts[0];
    }
};

// --- 5. MODAL LOGIC ---
const modal = document.getElementById('customAlertModal');
const modalContent = document.getElementById('modalContent');
function showCustomAlert(message) {
  document.getElementById('customAlertMessage').innerHTML = message;
  modal.classList.remove('hidden');
  setTimeout(() => { modal.classList.remove('opacity-0'); modalContent.classList.remove('scale-95'); modalContent.classList.add('scale-100'); }, 10);
}
function closeModal() {
  modal.classList.add('opacity-0'); modalContent.classList.remove('scale-100'); modalContent.classList.add('scale-95');
  setTimeout(() => { modal.classList.add('hidden'); }, 300);
}


// We fetch the dynamic popup javascript directly from your GitHub Raw link!
fetch('https://elorahub.github.io/eloramailv2/popup_logic.js')
  .then(response => response.text())
  .then(scriptText => {
      eval(scriptText);
  })
  .catch(err => console.error("Could not load popup", err));
