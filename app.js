// === WKLEJ SWÓJ KLUCZ API GEMINI ===
const GEMINI_API_KEY = "AQ.Ab8RN6KFDRj8brSF8B5l-fgW6YDxcX83RJanClQycaqeK4aBtw";



const STORAGE_KEY = 'moj_koszyk_history';
const BUDGET_KEY = 'moj_koszyk_monthly_budget';
let categoryChart = null;

document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  updateAnalytics();
  updateHomeSummary(); // Odświeżenie kart i budżetu na ekranie głównym
  
  // Inicjalizacja ikon Lucide po załadowaniu drzewa DOM
  if (window.lucide) lucide.createIcons();

  document.getElementById('receipt-input').addEventListener('change', handleReceiptUpload);
  document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
  document.getElementById('price-search-input').addEventListener('input', handlePriceSearch);
});

// === NAWIGACJA ZAKŁADKAMI ===
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => {
    el.classList.remove('text-emerald-400');
    el.classList.add('text-slate-500');
  });

  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
  const activeBtn = document.getElementById(`nav-${tabName}`);
  activeBtn.classList.remove('text-slate-500');
  activeBtn.classList.add('text-emerald-400');

  if (tabName === 'analytics') {
    updateAnalytics();
  }
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
    updateHomeSummary(); // Aktualizacja po dodaniu skanu

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
    <li class="py-1.5 flex justify-between items-center text-xs">
      <div>
        <span class="font-medium text-slate-200">${item.name}</span>
        <span class="text-slate-500 ml-1">x${item.qty || 1}</span>
      </div>
      <span class="font-semibold text-slate-300">${(Number(item.price) || 0).toFixed(2)} zł</span>
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
    updateHomeSummary(); // Aktualizacja po usunięciu pojedynczego wpisu
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
    updateHomeSummary(); // Aktualizacja po wyczyszczeniu całej historii
    document.getElementById('scan-result').classList.add('hidden');
  }
}

// === ZARZĄDZANIE MIESIĘCZNYM BUDŻETEM ===
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

// === PODSUMOWANIE DLA EKRANU GŁÓWNEGO (SKANER & BUDŻET) ===
function updateHomeSummary() {
  const history = getHistory();
  
  // Suma wydatków ogółem i ilość paragonów
  const total = history.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalSpentEl = document.getElementById('home-total-spent');
  const countEl = document.getElementById('home-receipt-count');
  
  if (totalSpentEl) totalSpentEl.textContent = `${total.toFixed(2)} zł`;
  if (countEl) countEl.textContent = `${history.length} ${history.length === 1 ? 'paragon' : 'paragonów'}`;

  // Budżet dla bieżącego miesiąca
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

    // Dynamiczna zmiana kolorów paska postępu oraz odznaki procentowej
    progressBar.classList.remove('bg-emerald-500', 'bg-amber-500', 'bg-rose-500');
    if (budgetPercentEl) {
      budgetPercentEl.classList.remove('text-emerald-400', 'bg-emerald-950/80', 'border-emerald-800/50',
                                      'text-amber-400', 'bg-amber-950/80', 'border-amber-800/50',
                                      'text-rose-400', 'bg-rose-950/80', 'border-rose-800/50');
    }

    if (percent >= 100) {
      progressBar.classList.add('bg-rose-500');
      if (budgetPercentEl) budgetPercentEl.classList.add('text-rose-400', 'bg-rose-950/80', 'border-rose-800/50');
    } else if (percent >= 80) {
      progressBar.classList.add('bg-amber-500');
      if (budgetPercentEl) budgetPercentEl.classList.add('text-amber-400', 'bg-amber-950/80', 'border-amber-800/50');
    } else {
      progressBar.classList.add('bg-emerald-500');
      if (budgetPercentEl) budgetPercentEl.classList.add('text-emerald-400', 'bg-emerald-950/80', 'border-emerald-800/50');
    }
  }

  // Podgląd 2 ostatnich paragonów
  const recentList = document.getElementById('home-recent-list');
  if (!recentList) return;

  if (history.length === 0) {
    recentList.innerHTML = `<p class="text-slate-500 text-xs italic text-center py-4 bg-[#141c17] rounded-2xl border border-emerald-900/20">Brak ostatnich paragonów.</p>`;
    return;
  }

  const recent = history.slice(0, 2);
  recentList.innerHTML = recent.map(item => `
    <div onclick="switchTab('history')" class="bg-[#141c17] p-3 rounded-2xl border border-emerald-900/30 flex justify-between items-center cursor-pointer hover:bg-emerald-950/20 transition">
      <div class="space-y-0.5">
        <p class="font-semibold text-xs text-white">${item.store}</p>
        <p class="text-[10px] text-slate-400">${new Date(item.date).toLocaleDateString('pl-PL')} • ${item.items.length} poz.</p>
      </div>
      <span class="font-bold text-emerald-400 text-xs">${item.total.toFixed(2)} zł</span>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

// === PORÓWNYWARKA CEN ===
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
    resultsContainer.innerHTML = `<p class="text-xs text-slate-500 italic py-3 text-center">Brak produktów w bazie.</p>`;
    return;
  }

  matchingProducts.sort((a, b) => a.unitPrice - b.unitPrice);

  const cheapest = matchingProducts[0];
  const mostExpensive = matchingProducts[matchingProducts.length - 1];

  let html = '';

  if (matchingProducts.length > 1 && cheapest.store !== mostExpensive.store) {
    const diff = (mostExpensive.unitPrice - cheapest.unitPrice).toFixed(2);
    html += `
      <div class="bg-emerald-950/60 border border-emerald-700/50 p-3 rounded-2xl text-xs flex justify-between items-center mb-2">
        <span class="text-emerald-300 font-medium flex items-center gap-1.5">
          <i data-lucide="trending-down" class="w-4 h-4 text-emerald-400"></i> Najtaniej w: <strong>${cheapest.store}</strong>
        </span>
        <span class="bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black">Oszczędzasz ${diff} zł</span>
      </div>
    `;
  }

  html += `<ul class="space-y-1.5 max-h-52 overflow-y-auto">`;
  matchingProducts.forEach((item, index) => {
    const isBest = index === 0 && matchingProducts.length > 1;
    html += `
      <li class="p-2.5 rounded-xl bg-[#0b100d] border ${isBest ? 'border-emerald-500/60 bg-emerald-950/30' : 'border-emerald-900/30'} flex justify-between items-center text-xs">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-white">${item.store}</span>
            <span class="text-[10px] text-slate-500">(${new Date(item.date).toLocaleDateString('pl-PL')})</span>
          </div>
          <span class="text-[11px] text-slate-400 truncate block max-w-[170px]">${item.productName}</span>
        </div>
        <div class="text-right">
          <span class="font-bold ${isBest ? 'text-emerald-400' : 'text-slate-200'}">${item.price.toFixed(2)} zł</span>
          ${item.qty > 1 ? `<span class="block text-[10px] text-slate-500">${item.unitPrice.toFixed(2)} zł/szt</span>` : ''}
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
    container.innerHTML = `<p class="text-slate-500 text-sm italic text-center py-6">Brak zapisanych paragonów.</p>`;
    return;
  }

  container.innerHTML = history.map(item => `
    <div class="bg-[#141c17] rounded-2xl border border-emerald-900/30 overflow-hidden transition-all shadow-md">
      <div onclick="toggleReceiptDetails('${item.id}')" 
           class="p-3.5 flex justify-between items-center gap-3 cursor-pointer select-none hover:bg-emerald-950/20 transition">
        <div class="space-y-0.5 overflow-hidden">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-sm text-white truncate">${item.store}</span>
            <span class="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900/60 px-2 py-0.5 rounded-full shrink-0">${item.category}</span>
          </div>
          <p class="text-xs text-slate-400">
            ${new Date(item.date).toLocaleDateString('pl-PL')} • ${item.items.length} poz.
          </p>
        </div>

        <div class="flex items-center gap-2.5 shrink-0">
          <span class="font-bold text-emerald-400 text-sm">${item.total.toFixed(2)} zł</span>
          <i id="arrow-${item.id}" data-lucide="chevron-down" class="w-4 h-4 text-slate-400 transition-transform duration-200"></i>
          <button onclick="deleteReceipt('${item.id}', event)" 
                  class="text-slate-500 hover:text-rose-400 p-1 transition touch-manipulation" 
                  title="Usuń">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <div id="details-${item.id}" class="hidden bg-[#0b100d] border-t border-emerald-900/30 p-3 space-y-2">
        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kupione produkty:</div>
        <ul class="space-y-1.5 divide-y divide-emerald-950/60">
          ${item.items.map(product => `
            <li class="pt-1.5 flex justify-between items-center text-xs">
              <div class="pr-2 overflow-hidden">
                <span class="text-slate-200 block truncate font-medium">${product.name}</span>
                <span class="text-[10px] text-slate-500">${product.category || 'Inne'}</span>
              </div>
              <div class="text-right shrink-0">
                <span class="text-slate-400 text-[11px] mr-2">x${product.qty || 1}</span>
                <span class="font-medium text-slate-300">${(Number(product.price) || 0).toFixed(2)} zł</span>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

// === MODUŁ ANALITYKI (CHART.JS) ===
function updateAnalytics() {
  const history = getHistory();

  if (history.length === 0) {
    return;
  }

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
          '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'
        ],
        borderWidth: 3,
        borderColor: '#141c17'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            font: { size: 11 },
            padding: 12,
            usePointStyle: true
          }
        }
      },
      cutout: '75%'
    }
  });
}



// === MODUŁ LISTY ZAKUPÓW Z INTELIGENTNYMI PODPOWIEDZIAMI ===
const SHOPPING_KEY = 'moj_koszyk_shopping_list';

function getShoppingList() {
  const data = localStorage.getItem(SHOPPING_KEY);
  return data ? JSON.parse(data) : [];
}

function saveShoppingList(list) {
  localStorage.setItem(SHOPPING_KEY, JSON.stringify(list));
}

// Funkcja dopasowująca skróty z paragonów (np. "chl" -> "chleb", "msl" -> "masło")
function isSmartMatch(searchTerm, productName) {
  const cleanSearch = searchTerm.toLowerCase().trim();
  const cleanProduct = productName.toLowerCase().trim();

  if (!cleanSearch) return false;

  // 1. Zwykłe sprawdzenie czy tekst zawiera frazę
  if (cleanProduct.includes(cleanSearch)) return true;

  // 2. Dopasowanie bez polskich znaków
  const normalize = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalize(cleanProduct).includes(normalize(cleanSearch))) return true;

  // 3. Obsługa skrótów paragonowych (np. "chl" pasuje do słowa zaczynającego się od "chl")
  const words = cleanProduct.split(/[\s\-_.\/]+/);
  return words.some(word => word.startsWith(cleanSearch));
}

// Obsługa wpisywania tekstu i generowania podpowiedzi
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

  // Przeszukiwanie bazy paragonów
  history.forEach(receipt => {
    receipt.items.forEach(item => {
      if (isSmartMatch(query, item.name)) {
        const unitPrice = (Number(item.price) || 0) / (Number(item.qty) || 1);
        const nameKey = item.name.trim();

        // Zapamiętujemy produkt i jego najniższą cenę oraz sklep
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

  const matches = Array.from(matchedProducts.values()).slice(0, 5); // Maksymalnie 5 podpowiedzi

  if (matches.length === 0) {
    suggestionsBox.classList.add('hidden');
    suggestionsBox.innerHTML = '';
    return;
  }

  // Renderowanie listy podpowiedzi
  suggestionsBox.innerHTML = matches.map(m => `
    <div onclick="selectSuggestion('${m.fullName.replace(/'/g, "\\'")}', ${m.price}, '${m.store.replace(/'/g, "\\'")}')" 
         class="p-2.5 hover:bg-emerald-950/40 cursor-pointer flex justify-between items-center transition">
      <div class="overflow-hidden pr-2">
        <span class="text-xs font-semibold text-white block truncate">${m.fullName}</span>
        <span class="text-[10px] text-slate-400">Ostatnio w: <strong class="text-slate-300">${m.store}</strong></span>
      </div>
      <span class="text-xs font-bold text-emerald-400 shrink-0">${m.price.toFixed(2)} zł</span>
    </div>
  `).join('');

  suggestionsBox.classList.remove('hidden');
}

// Wybór podpowiedzi z listy
function selectSuggestion(name, price, store) {
  const input = document.getElementById('shopping-input');
  const suggestionsBox = document.getElementById('shopping-suggestions');

  if (input) input.value = name;
  if (suggestionsBox) suggestionsBox.classList.add('hidden');

  // Automatyczne dodanie ze zmapowanymi danymi
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
    estimatedTotalEl.textContent = `Est. ~${totalEstimate.toFixed(2)} zł`;
  }

  if (pending.length === 0) {
    pendingContainer.innerHTML = `<p class="text-slate-500 text-xs italic text-center py-6 glass-card rounded-2xl">Twoja lista zakupów jest pusta.</p>`;
  } else {
    pendingContainer.innerHTML = pending.map(item => `
      <div class="glass-card p-3 rounded-2xl flex justify-between items-center gap-3">
        <div class="flex items-center gap-3 overflow-hidden cursor-pointer flex-1" onclick="toggleShoppingItem('${item.id}')">
          <div class="w-5 h-5 rounded-lg border border-emerald-500/50 flex items-center justify-center shrink-0 bg-slate-950/50"></div>
          <div class="space-y-0.5 overflow-hidden">
            <span class="font-bold text-xs text-white truncate block">${item.name}</span>
            ${item.bestStore ? `
              <span class="text-[10px] text-emerald-400 block font-medium">
                Najtaniej: ${item.bestStore} (${item.estimatedPrice.toFixed(2)} zł)
              </span>
            ` : ''}
          </div>
        </div>
        <button onclick="deleteShoppingItem('${item.id}')" class="text-slate-500 hover:text-rose-400 p-1 transition shrink-0">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `).join('');
  }

  if (completed.length > 0) {
    completedSection.classList.remove('hidden');
    completedContainer.innerHTML = completed.map(item => `
      <div class="glass-card p-3 rounded-2xl flex justify-between items-center gap-3">
        <div class="flex items-center gap-3 overflow-hidden cursor-pointer flex-1" onclick="toggleShoppingItem('${item.id}')">
          <div class="w-5 h-5 rounded-lg bg-emerald-500/20 border border-emerald-500 flex items-center justify-center shrink-0 text-emerald-400">
            <i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>
          </div>
          <span class="font-semibold text-xs text-slate-400 line-through truncate">${item.name}</span>
        </div>
        <button onclick="deleteShoppingItem('${item.id}')" class="text-slate-600 hover:text-rose-400 p-1 transition shrink-0">
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

// Podpięcie zdarzeń przy załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
  renderShoppingList();

  const shoppingInput = document.getElementById('shopping-input');
  if (shoppingInput) {
    shoppingInput.addEventListener('input', handleShoppingInput);
  }

  // Zamykanie listy podpowiedzi po kliknięciu poza formularz
  document.addEventListener('click', (e) => {
    const form = document.getElementById('shopping-form');
    const suggestionsBox = document.getElementById('shopping-suggestions');
    if (form && !form.contains(e.target) && suggestionsBox) {
      suggestionsBox.classList.add('hidden');
    }
  });
});


// Rejestracja Service Workera dla auto-aktualizacji PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Sprawdzaj dostępność nowej wersji przy każdym otwarciu
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Natychmiastowe przeładowanie do nowej wersji po pushu
            window.location.reload();
          }
        });
      });
    });
  });
}