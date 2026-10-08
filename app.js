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
// ✅ Bezpieczny kod:
const btn = document.getElementById('jakis-przycisk');
if (btn) {
  btn.addEventListener('click', (e) => {
    // Twoja logika
  });
}
  document.getElementById('price-search-input').addEventListener('input', handlePriceSearch);
});

// === NAWIGACJA ZAKŁADKAMI ===
function switchTab(tabName) {
  // Ukryj wszystkie zakładki
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  
  // Zresetuj kolory nawigacji (usuń stare i nowe akcenty)
  document.querySelectorAll('.nav-btn').forEach(el => {
    el.classList.remove('active', 'text-[#d4ff38]', 'text-emerald-400');
    el.classList.add('text-slate-400');
  });

  // Pokaż wybraną zakładkę
  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) {
    targetTab.classList.remove('hidden');
  }

  // Aktywuj przycisk w nawigacji z limonkowym akcentem
  const activeBtn = document.getElementById(`nav-${tabName}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-400', 'text-slate-500');
    activeBtn.classList.add('active', 'text-[#d4ff38]');
  }

  // Odśwież wykresy, jeśli przełączamy na analitykę
  if (tabName === 'analytics' && typeof updateAnalytics === 'function') {
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

// === MIESIĘCZNA HISTORIA Z ZWIJANYMI PARAGONAMI ===
function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  const history = getHistory();

  if (!history || history.length === 0) {
    container.innerHTML = `
      <div class="glass-card p-6 rounded-3xl text-center space-y-2">
        <i data-lucide="receipt" class="w-8 h-8 text-slate-600 mx-auto"></i>
        <p class="text-slate-400 text-xs italic">Brak zapisanych paragonów w historii.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // 1. Sortowanie paragonów malejąco po dacie (najnowsze na samej górze)
  const sortedHistory = [...history].sort((a, b) => {
    const dateA = new Date(a.date || a.timestamp || 0);
    const dateB = new Date(b.date || b.timestamp || 0);
    return dateB - dateA;
  });

  // 2. Grupowanie paragonów według miesięcy
  const groupedByMonth = sortedHistory.reduce((groups, receipt) => {
    const dateObj = new Date(receipt.date || receipt.timestamp || Date.now());
    const monthYear = dateObj.toLocaleDateString('pl-PL', {
      month: 'long',
      year: 'numeric'
    });
    
    const formattedMonth = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

    if (!groups[formattedMonth]) {
      groups[formattedMonth] = [];
    }
    groups[formattedMonth].push(receipt);
    return groups;
  }, {});

  // 3. Renderowanie eleganckiej, zwijanej listy
  let html = '';

  Object.keys(groupedByMonth).forEach(monthLabel => {
    const receiptsInMonth = groupedByMonth[monthLabel];
    const monthTotal = receiptsInMonth.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

    html += `
      <div class="space-y-2 pt-2">
        <!-- Nagłówek Miesiąca -->
        <div class="flex justify-between items-center px-1 border-b border-emerald-900/40 pb-1">
          <h3 class="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="calendar" class="w-3.5 h-3.5"></i> ${monthLabel}
          </h3>
          <span class="text-[10px] font-bold text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-800">
            Miesiąc: ${monthTotal.toFixed(2)} zł
          </span>
        </div>

        <!-- Zwijana lista paragonów z danego miesiąca -->
        <div class="space-y-2">
          ${receiptsInMonth.map(receipt => {
            const receiptDate = new Date(receipt.date || receipt.timestamp || Date.now());
            const formattedDate = receiptDate.toLocaleDateString('pl-PL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });

            const itemCount = (receipt.items || []).length;

            return `
              <details class="glass-card rounded-2xl group transition overflow-hidden">
                <!-- Pasek nagłówkowy paragonu (zwinięty widok) -->
                <summary class="p-3.5 flex justify-between items-center cursor-pointer select-none list-none">
                  <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center shrink-0 text-emerald-400">
                      <i data-lucide="shopping-bag" class="w-4 h-4"></i>
                    </div>
                    <div class="overflow-hidden">
                      <h4 class="font-extrabold text-xs text-white truncate">${receipt.store || 'Nieznany sklep'}</h4>
                      <p class="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>${formattedDate}</span>
                        <span>•</span>
                        <span>${itemCount}${itemCount === 1 ? 'produkt' : 'produkty'}</span>
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-xs font-black text-emerald-400">${Number(receipt.total || 0).toFixed(2)} zł</span>
                    <i data-lucide="chevron-down" class="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform"></i>
                  </div>
                </summary>

                <!-- Rozwijana lista produktów ze szczegółami -->
                <div class="px-3.5 pb-3.5 pt-1 border-t border-slate-800/60 space-y-2 bg-slate-950/40">
                  <div class="space-y-1.5 pt-1">
                    ${(receipt.items || []).map(item => `
                      <div class="flex justify-between items-center text-xs py-1 border-b border-slate-900/60 last:border-0">
                        <span class="text-slate-300 font-medium truncate pr-2">${item.name}</span>
                        <div class="text-right shrink-0">
                          <span class="text-slate-500 text-[10px] mr-1.5">${item.qty || 1}x</span>
                          <span class="text-slate-200 font-bold">${Number(item.price || 0).toFixed(2)} zł</span>
                        </div>
                      </div>
                    `).join('')}
                  </div>

                  <!-- Stopka rozwijanego paragonu z opcją usunięcia -->
                  <div class="flex justify-between items-center pt-2 text-[10px] text-slate-500">
                    <span>ID: #${receipt.id ? receipt.id.slice(-6) : '---'}</span>
                    <button onclick="deleteReceipt('${receipt.id}')" class="text-rose-400 hover:text-rose-300 font-semibold transition flex items-center gap-1">
                      <i data-lucide="trash-2" class="w-3 h-3"></i> Usuń paragon
                    </button>
                  </div>
                </div>
              </details>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
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