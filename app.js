// === WKLEJ SWÓJ KLUCZ API GEMINI ===
const GEMINI_API_KEY = "AQ.Ab8RN6KFDRj8brSF8B5l-fgW6YDxcX83RJanClQycaqeK4aBtw";

const firebaseConfig = {
  apiKey: "AIzaSyDA3nJWbDgSe2Z31PioJspqMvuSt0tEUcY",
  authDomain: "moj-koszyk-app.firebaseapp.com",
  databaseURL: "https://moj-koszyk-app-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "moj-koszyk-app",
  storageBucket: "moj-koszyk-app.firebasestorage.app",
  messagingSenderId: "158379518260",
  appId: "1:158379518260:web:e576d0a89163d75ee31d61",
  measurementId: "G-XH32GE9VWZ"
};

const STORAGE_KEY = 'moj_koszyk_history';
const BUDGET_KEY = 'moj_koszyk_monthly_budget';
const SYNC_CODE_KEY = 'moj_koszyk_sync_code';

let categoryChart = null;
let currentSyncCode = localStorage.getItem(SYNC_CODE_KEY) || 'SYNC-8921';


document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  updateAnalytics();
  updateHomeSummary();
  renderShoppingList();
  initProfileTab();
  
  if (window.lucide) lucide.createIcons();

  document.getElementById('receipt-input').addEventListener('change', handleReceiptUpload);
  document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
  document.getElementById('price-search-input').addEventListener('input', handlePriceSearch);

  const shoppingInput = document.getElementById('shopping-input');
  if (shoppingInput) {
    shoppingInput.addEventListener('input', handleShoppingInput);
  }

  document.addEventListener('click', (e) => {
    const form = document.getElementById('shopping-form');
    const suggestionsBox = document.getElementById('shopping-suggestions');
    if (form && !form.contains(e.target) && suggestionsBox) {
      suggestionsBox.classList.add('hidden');
    }
  });
});

// === NAWIGACJA ZAKŁADKAMI Z NEONOWYM WYPEŁNIENIEM ===
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  
  document.querySelectorAll('.nav-btn').forEach(el => {
    el.classList.remove('text-[#D4FF00]', 'bg-black', 'px-3.5');
    el.classList.add('text-[#8E95A5]', 'px-3');
    // Chowanie etykiet tekstowych w nieaktywnych
    const span = el.querySelector('span');
    if (span) span.remove();
  });

  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) {
    targetTab.classList.remove('hidden');
  }

  const activeBtn = document.getElementById(`nav-${tabName}`);
  
  if (activeBtn) {
    activeBtn.classList.remove('text-[#8E95A5]', 'px-3');
    activeBtn.classList.add('text-[#D4FF00]', 'bg-black', 'px-3.5');

    const titles = {
      scanner: 'Skaner',
      compare: 'Szukaj',
      shopping: 'Lista',
      analytics: 'Analityka',
      history: 'Historia',
      profile: 'Profil'
    };

    const span = document.createElement('span');
    span.className = 'text-[11px] font-black uppercase ml-1';
    span.textContent = titles[tabName] || tabName;
    activeBtn.appendChild(span);
  }

  if (tabName === 'analytics') {
    updateAnalytics();
  }

  if (tabName === 'profile') {
    initProfileTab();
  }

  if (window.lucide) lucide.createIcons();
}

async function handleReceiptUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('TWÓJ_KLUCZ')) {
    alert('Wklej swój klucz API w pliku app.js w zmiennej GEMINI_API_KEY!');
    return;
  }

  const spinner = document.getElementById('loading-spinner');
  const resultCard = document.getElementById('scan-result');
  
  spinner.classList.remove('hidden');
  resultCard.classList.add('hidden');

  try {
    const parsedData = await analyzeReceiptWithGemini(file, GEMINI_API_KEY);
    
    const receiptRecord = {
      id: 'rec_' + Date.now(),
      date: new Date().toISOString(),
      store: parsedData.storeName || 'Nieznany sklep',
      address: parsedData.storeAddress || 'Brak adresu',
      total: Number(parsedData.totalAmount) || 0,
      category: parsedData.category || 'Inne',
      items: parsedData.items || []
    };

    displayCurrentResult(receiptRecord);
    saveToHistory(receiptRecord);
    renderHistory();
    updateAnalytics();
    updateHomeSummary();

  } catch (error) {
    console.error(error);
    alert('Błąd odczytu paragonu: ' + error.message);
  } finally {
    spinner.classList.add('hidden');
    event.target.value = '';
  }
}

function displayCurrentResult(data) {
  document.getElementById('res-store').textContent = data.store;
  document.getElementById('res-address').textContent = data.address;
  document.getElementById('res-total').textContent = `${data.total.toFixed(2)} PLN`;
  document.getElementById('res-category').textContent = data.category;

  const itemsList = document.getElementById('res-items');
  itemsList.innerHTML = data.items.map(item => `
    <li class="py-2 flex justify-between items-center text-xs font-semibold">
      <div>
        <span class="text-white">${item.name}</span>
        <span class="text-[#8E95A5] ml-1">x${item.qty || 1}</span>
      </div>
      <span class="text-[#D4FF00] font-bold">${(Number(item.price) || 0).toFixed(2)} zł</span>
    </li>
  `).join('');

  document.getElementById('scan-result').classList.remove('hidden');
}

function saveToHistory(record) {
  const history = getHistory();
  history.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function getHistory() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function deleteReceipt(id, event) {
  if (event) event.stopPropagation();

  if (confirm('Czy na pewno chcesz usunąć ten paragon?')) {
    let history = getHistory();
    history = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    renderHistory();
    updateAnalytics();
    updateHomeSummary();
  }
}

function toggleReceiptDetails(id) {
  const detailsEl = document.getElementById(`details-${id}`);
  const arrowEl = document.getElementById(`arrow-${id}`);
  
  if (detailsEl) {
    const isHidden = detailsEl.classList.contains('hidden');
    detailsEl.classList.toggle('hidden');
    if (arrowEl) {
      arrowEl.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }
}

function clearHistory() {
  if (confirm('Czy na pewno chcesz usunąć całą historię paragonów?')) {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    updateAnalytics();
    updateHomeSummary();
    document.getElementById('scan-result').classList.add('hidden');
  }
}

function getMonthlyBudget() {
  const savedBudget = localStorage.getItem(BUDGET_KEY);
  return savedBudget ? parseFloat(savedBudget) : 1500;
}

function setMonthlyBudget() {
  const currentBudget = getMonthlyBudget();
  const input = prompt('Wpisz swój miesięczny limit wydatków (PLN):', currentBudget);
  
  if (input !== null) {
    const val = parseFloat(input.replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      localStorage.setItem(BUDGET_KEY, val);
      updateHomeSummary();
    } else {
      alert('Podaj poprawną kwotę (np. 1500).');
    }
  }
}

function updateHomeSummary() {
  const history = getHistory();
  
  const total = history.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalSpentEl = document.getElementById('home-total-spent');
  const countEl = document.getElementById('home-receipt-count');
  
  if (totalSpentEl) totalSpentEl.textContent = `${total.toFixed(2)} zł`;
  if (countEl) countEl.textContent = `${history.length} szt.`;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthSpent = history.reduce((sum, item) => {
    const d = new Date(item.date);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      return sum + (Number(item.total) || 0);
    }
    return sum;
  }, 0);

  const budgetLimit = getMonthlyBudget();
  const percent = Math.min(Math.round((currentMonthSpent / budgetLimit) * 100), 100);

  const budgetSpentEl = document.getElementById('budget-spent');
  const budgetLimitEl = document.getElementById('budget-limit-display');
  const budgetPercentEl = document.getElementById('budget-percent');
  const progressBar = document.getElementById('budget-progress-bar');

  if (budgetSpentEl) budgetSpentEl.textContent = `${currentMonthSpent.toFixed(2)} zł`;
  if (budgetLimitEl) budgetLimitEl.textContent = `${budgetLimit} zł`;
  if (budgetPercentEl) budgetPercentEl.textContent = `${percent}%`;

  if (progressBar) {
    progressBar.style.width = `${percent}%`;
    progressBar.classList.remove('bg-[#D4FF00]', 'bg-amber-500', 'bg-rose-500');

    if (percent >= 100) {
      progressBar.classList.add('bg-rose-500');
    } else if (percent >= 80) {
      progressBar.classList.add('bg-amber-500');
    } else {
      progressBar.classList.add('bg-[#D4FF00]');
    }
  }

  const recentList = document.getElementById('home-recent-list');
  if (!recentList) return;

  if (history.length === 0) {
    recentList.innerHTML = `<p class="text-[#8E95A5] text-xs italic text-center py-5 neo-card">Brak ostatnich paragonów.</p>`;
    return;
  }

  const recent = history.slice(0, 2);
  recentList.innerHTML = recent.map(item => `
    <div onclick="switchTab('history')" class="neo-card p-4 flex justify-between items-center cursor-pointer hover:border-[#D4FF00]/50 transition">
      <div class="space-y-0.5">
        <p class="font-black text-xs uppercase text-white">${item.store}</p>
        <p class="text-[10px] font-bold text-[#8E95A5]">${new Date(item.date).toLocaleDateString('pl-PL')} • ${item.items.length} poz.</p>
      </div>
      <span class="font-black text-[#D4FF00] text-sm">${item.total.toFixed(2)} zł</span>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function handlePriceSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  const resultsContainer = document.getElementById('price-comparison-results');

  if (query.length < 2) {
    resultsContainer.classList.add('hidden');
    resultsContainer.innerHTML = '';
    return;
  }

  const history = getHistory();
  const matchingProducts = [];

  history.forEach(receipt => {
    receipt.items.forEach(product => {
      if (product.name.toLowerCase().includes(query)) {
        matchingProducts.push({
          productName: product.name,
          price: Number(product.price) || 0,
          qty: Number(product.qty) || 1,
          unitPrice: (Number(product.price) || 0) / (Number(product.qty) || 1),
          store: receipt.store,
          date: receipt.date
        });
      }
    });
  });

  if (matchingProducts.length === 0) {
    resultsContainer.classList.remove('hidden');
    resultsContainer.innerHTML = `<p class="text-xs text-[#8E95A5] italic py-3 text-center">Brak produktów w bazie.</p>`;
    return;
  }

  matchingProducts.sort((a, b) => a.unitPrice - b.unitPrice);

  const cheapest = matchingProducts[0];
  const mostExpensive = matchingProducts[matchingProducts.length - 1];

  let html = '';

  if (matchingProducts.length > 1 && cheapest.store !== mostExpensive.store) {
    const diff = (mostExpensive.unitPrice - cheapest.unitPrice).toFixed(2);
    html += `
      <div class="neo-card-lime p-3 text-xs flex justify-between items-center mb-2">
        <span class="text-black font-extrabold uppercase flex items-center gap-1">
          <i data-lucide="trending-down" class="w-4 h-4 text-black"></i> Najtaniej w: <strong>${cheapest.store}</strong>
        </span>
        <span class="bg-black text-[#D4FF00] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">Oszczędzasz ${diff} zł</span>
      </div>
    `;
  }

  html += `<ul class="space-y-2 max-h-52 overflow-y-auto">`;
  matchingProducts.forEach((item, index) => {
    const isBest = index === 0 && matchingProducts.length > 1;
    html += `
      <li class="p-3 rounded-2xl bg-[#0D0E10] border ${isBest ? 'border-[#D4FF00]' : 'border-[#262930]'} flex justify-between items-center text-xs">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-black uppercase text-white">${item.store}</span>
            <span class="text-[10px] font-bold text-[#8E95A5]">(${new Date(item.date).toLocaleDateString('pl-PL')})</span>
          </div>
          <span class="text-[11px] text-[#8E95A5] font-semibold truncate block max-w-[170px]">${item.productName}</span>
        </div>
        <div class="text-right">
          <span class="font-black ${isBest ? 'text-[#D4FF00]' : 'text-white'}">${item.price.toFixed(2)} zł</span>
          ${item.qty > 1 ? `<span class="block text-[10px] font-bold text-[#8E95A5]">${item.unitPrice.toFixed(2)} zł/szt</span>` : ''}
        </div>
      </li>
    `;
  });
  html += `</ul>`;

  resultsContainer.innerHTML = html;
  resultsContainer.classList.remove('hidden');

  if (window.lucide) lucide.createIcons();
}

function renderHistory() {
  const history = getHistory();
  const container = document.getElementById('history-list');

  if (history.length === 0) {
    container.innerHTML = `<p class="text-[#8E95A5] text-sm italic text-center py-6 neo-card">Brak zapisanych paragonów.</p>`;
    return;
  }

  container.innerHTML = history.map(item => `
    <div class="neo-card overflow-hidden transition-all shadow-md">
      <div onclick="toggleReceiptDetails('${item.id}')" 
           class="p-4 flex justify-between items-center gap-3 cursor-pointer select-none hover:bg-[#1f2229] transition">
        <div class="space-y-0.5 overflow-hidden">
          <div class="flex items-center gap-2">
            <span class="font-black text-sm text-white uppercase truncate">${item.store}</span>
            <span class="text-[10px] bg-black text-[#D4FF00] border border-[#262930] px-2 py-0.5 rounded-full font-extrabold uppercase shrink-0">${item.category}</span>
          </div>
          <p class="text-xs font-semibold text-[#8E95A5]">
            ${new Date(item.date).toLocaleDateString('pl-PL')} • ${item.items.length} poz.
          </p>
        </div>

        <div class="flex items-center gap-2.5 shrink-0">
          <span class="font-black text-[#D4FF00] text-sm">${item.total.toFixed(2)} zł</span>
          <i id="arrow-${item.id}" data-lucide="chevron-down" class="w-4 h-4 text-[#8E95A5] transition-transform duration-200"></i>
          <button onclick="deleteReceipt('${item.id}', event)" 
                  class="text-[#8E95A5] hover:text-rose-400 p-1 transition" 
                  title="Usuń">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <div id="details-${item.id}" class="hidden bg-[#0D0E10] border-t border-[#262930] p-4 space-y-2">
        <div class="text-[10px] font-black text-[#8E95A5] uppercase tracking-wider">Kupione produkty:</div>
        <ul class="space-y-1.5 divide-y divide-[#262930]">
          ${item.items.map(product => `
            <li class="pt-2 flex justify-between items-center text-xs font-semibold">
              <div class="pr-2 overflow-hidden">
                <span class="text-white block truncate">${product.name}</span>
                <span class="text-[10px] text-[#8E95A5]">${product.category || 'Inne'}</span>
              </div>
              <div class="text-right shrink-0">
                <span class="text-[#8E95A5] text-[11px] mr-2">x${product.qty || 1}</span>
                <span class="font-bold text-white">${(Number(product.price) || 0).toFixed(2)} zł</span>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function updateAnalytics() {
  const history = getHistory();

  if (history.length === 0) return;

  const categoryTotals = {};
  let totalSpent = 0;

  history.forEach(item => {
    const cat = item.category || 'Inne';
    const amount = Number(item.total) || 0;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
    totalSpent += amount;
  });

  const totalBadge = document.getElementById('total-spent-badge');
  if (totalBadge) totalBadge.textContent = `${totalSpent.toFixed(2)} zł`;

  const labels = Object.keys(categoryTotals);
  const dataValues = Object.values(categoryTotals);

  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (categoryChart) {
    categoryChart.destroy();
  }

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: [
          '#D4FF00', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'
        ],
        borderWidth: 3,
        borderColor: '#16181D'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#8E95A5',
            font: { size: 11, weight: 'bold' },
            padding: 12,
            usePointStyle: true
          }
        }
      },
      cutout: '75%'
    }
  });
}

// === LISTA ZAKUPÓW ===
const SHOPPING_KEY = 'moj_koszyk_shopping_list';

function getShoppingList() {
  const data = localStorage.getItem(SHOPPING_KEY);
  return data ? JSON.parse(data) : [];
}

function saveShoppingList(list) {
  localStorage.setItem(SHOPPING_KEY, JSON.stringify(list));
}

function isSmartMatch(searchTerm, productName) {
  const cleanSearch = searchTerm.toLowerCase().trim();
  const cleanProduct = productName.toLowerCase().trim();

  if (!cleanSearch) return false;
  if (cleanProduct.includes(cleanSearch)) return true;

  const normalize = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalize(cleanProduct).includes(normalize(cleanSearch))) return true;

  const words = cleanProduct.split(/[\s\-_.\/]+/);
  return words.some(word => word.startsWith(cleanSearch));
}

function handleShoppingInput(e) {
  const query = e.target.value.trim();
  const suggestionsBox = document.getElementById('shopping-suggestions');

  if (!suggestionsBox) return;

  if (query.length < 2) {
    suggestionsBox.classList.add('hidden');
    suggestionsBox.innerHTML = '';
    return;
  }

  const history = getHistory();
  const matchedProducts = new Map();

  history.forEach(receipt => {
    receipt.items.forEach(item => {
      if (isSmartMatch(query, item.name)) {
        const unitPrice = (Number(item.price) || 0) / (Number(item.qty) || 1);
        const nameKey = item.name.trim();

        if (!matchedProducts.has(nameKey) || matchedProducts.get(nameKey).price > unitPrice) {
          matchedProducts.set(nameKey, {
            fullName: item.name,
            price: unitPrice,
            store: receipt.store
          });
        }
      }
    });
  });

  const matches = Array.from(matchedProducts.values()).slice(0, 5);

  if (matches.length === 0) {
    suggestionsBox.classList.add('hidden');
    suggestionsBox.innerHTML = '';
    return;
  }

  suggestionsBox.innerHTML = matches.map(m => `
    <div onclick="selectSuggestion('${m.fullName.replace(/'/g, "\\'")}', ${m.price}, '${m.store.replace(/'/g, "\\'")}')" 
         class="p-3 hover:bg-black cursor-pointer flex justify-between items-center transition">
      <div class="overflow-hidden pr-2">
        <span class="text-xs font-black text-white block truncate uppercase">${m.fullName}</span>
        <span class="text-[10px] text-[#8E95A5] font-bold">Ostatnio: <strong class="text-white">${m.store}</strong></span>
      </div>
      <span class="text-xs font-black text-[#D4FF00] shrink-0">${m.price.toFixed(2)} zł</span>
    </div>
  `).join('');

  suggestionsBox.classList.remove('hidden');
}

function selectSuggestion(name, price, store) {
  const input = document.getElementById('shopping-input');
  const suggestionsBox = document.getElementById('shopping-suggestions');

  if (input) input.value = name;
  if (suggestionsBox) suggestionsBox.classList.add('hidden');

  const list = getShoppingList();
  list.unshift({
    id: 'shop_' + Date.now(),
    name: name,
    completed: false,
    estimatedPrice: price,
    bestStore: store
  });

  saveShoppingList(list);
  if (input) input.value = '';
  renderShoppingList();
}

function renderShoppingList() {
  const list = getShoppingList();
  const pendingContainer = document.getElementById('shopping-pending-list');
  const completedContainer = document.getElementById('shopping-completed-list');
  const completedSection = document.getElementById('shopping-completed-section');
  const estimatedTotalEl = document.getElementById('shopping-estimated-total');

  if (!pendingContainer || !completedContainer) return;

  const pending = list.filter(item => !item.completed);
  const completed = list.filter(item => item.completed);

  const totalEstimate = pending.reduce((sum, item) => sum + (Number(item.estimatedPrice) || 0), 0);
  if (estimatedTotalEl) {
    estimatedTotalEl.textContent = `Est: ~${totalEstimate.toFixed(2)} zł`;
  }

  if (pending.length === 0) {
    pendingContainer.innerHTML = `<p class="text-[#8E95A5] text-xs italic text-center py-6 neo-card">Lista jest pusta.</p>`;
  } else {
    pendingContainer.innerHTML = pending.map(item => `
      <div class="neo-card p-3.5 flex justify-between items-center gap-3">
        <div class="flex items-center gap-3 overflow-hidden cursor-pointer flex-1" onclick="toggleShoppingItem('${item.id}')">
          <div class="w-5 h-5 rounded-lg border border-[#262930] bg-[#0D0E10] flex items-center justify-center shrink-0"></div>
          <div class="space-y-0.5 overflow-hidden">
            <span class="font-black text-xs text-white truncate block uppercase">${item.name}</span>
            ${item.bestStore ? `
              <span class="text-[10px] text-[#D4FF00] block font-extrabold">
                Najtaniej: ${item.bestStore} (${item.estimatedPrice.toFixed(2)} zł)
              </span>
            ` : ''}
          </div>
        </div>
        <button onclick="deleteShoppingItem('${item.id}')" class="text-[#8E95A5] hover:text-rose-400 p-1 transition shrink-0">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `).join('');
  }

  if (completed.length > 0) {
    completedSection.classList.remove('hidden');
    completedContainer.innerHTML = completed.map(item => `
      <div class="neo-card p-3.5 flex justify-between items-center gap-3">
        <div class="flex items-center gap-3 overflow-hidden cursor-pointer flex-1" onclick="toggleShoppingItem('${item.id}')">
          <div class="w-5 h-5 rounded-lg bg-[#D4FF00] flex items-center justify-center shrink-0 text-black">
            <i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>
          </div>
          <span class="font-bold text-xs text-[#8E95A5] line-through truncate uppercase">${item.name}</span>
        </div>
        <button onclick="deleteShoppingItem('${item.id}')" class="text-[#8E95A5] hover:text-rose-400 p-1 transition shrink-0">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `).join('');
  } else {
    completedSection.classList.add('hidden');
  }

  if (window.lucide) lucide.createIcons();
}

function addShoppingItem(event) {
  event.preventDefault();
  const input = document.getElementById('shopping-input');
  const suggestionsBox = document.getElementById('shopping-suggestions');
  const name = input.value.trim();

  if (!name) return;

  if (suggestionsBox) suggestionsBox.classList.add('hidden');

  const history = getHistory();
  let bestPrice = 0;
  let bestStore = null;

  history.forEach(receipt => {
    receipt.items.forEach(product => {
      if (isSmartMatch(name, product.name)) {
        const unitPrice = (Number(product.price) || 0) / (Number(product.qty) || 1);
        if (bestPrice === 0 || unitPrice < bestPrice) {
          bestPrice = unitPrice;
          bestStore = receipt.store;
        }
      }
    });
  });

  const list = getShoppingList();
  list.unshift({
    id: 'shop_' + Date.now(),
    name: name,
    completed: false,
    estimatedPrice: bestPrice,
    bestStore: bestStore
  });

  saveShoppingList(list);
  input.value = '';
  renderShoppingList();
}

function toggleShoppingItem(id) {
  const list = getShoppingList();
  const item = list.find(i => i.id === id);
  if (item) {
    item.completed = !item.completed;
    saveShoppingList(list);
    renderShoppingList();
  }
}

function deleteShoppingItem(id) {
  let list = getShoppingList();
  list = list.filter(i => i.id !== id);
  saveShoppingList(list);
  renderShoppingList();
}

function clearCompletedShoppingItems() {
  let list = getShoppingList();
  list = list.filter(i => !i.completed);
  saveShoppingList(list);
  renderShoppingList();
}

// === PROFIL I WSPÓLNY BUDŻET (GENEROWANIE KODU) ===
function initProfileTab() {
  const linkInput = document.getElementById('share-link-input');
  const codeDisplay = document.getElementById('sync-code-display');

  const baseUrl = "https://mojkoszyk.vercel.app";
  if (linkInput) {
    linkInput.value = `https://mojkoszyk.vercel.app/join?code=${currentSyncCode}`;
  }
  if (codeDisplay) {
    codeDisplay.textContent = currentSyncCode;
  }
}

function generateNewCode() {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  currentSyncCode = `SYNC-${randomNum}`;

  localStorage.setItem(SYNC_CODE_KEY, currentSyncCode);
  initProfileTab();

  alert(`Wygenerowano nowy kod parowania: ${currentSyncCode}`);
}

function copyShareLink() {
  const linkInput = document.getElementById('share-link-input');
  if (!linkInput) return;

  linkInput.select();
  linkInput.setSelectionRange(0, 99999);

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(linkInput.value)
      .then(() => alert('Link do wspólnego budżetu został skopiowany!'))
      .catch(() => fallbackCopy(linkInput));
  } else {
    fallbackCopy(linkInput);
  }
}

function fallbackCopy(input) {
  try {
    document.execCommand('copy');
    alert('Link skopiowany do schowka!');
  } catch (err) {
    alert('Nie udało się skopiować automatycznie. Zaznacz tekst i skopiuj ręcznie.');
  }
}