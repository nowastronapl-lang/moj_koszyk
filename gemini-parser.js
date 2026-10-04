// Konwersja zdjęcia na format base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Główna funkcja wywołująca model Gemini
async function analyzeReceiptWithGemini(file, apiKey) {
  const base64Image = await fileToBase64(file);

  const prompt = `
    Przeanalizuj to zdjęcie paragonu i wyciągnij następujące dane w czystym formacie JSON:
    1. "storeName": nazwa sklepu/firmy (np. Biedronka, Lidl, Rossmann, CPH).
    2. "storeAddress": pełny adres sklepu (ulica, miasto, jeśli widoczne na zdjęciu).
    3. "totalAmount": łączna kwota do zapłaty (jako liczba float, np. 45.99).
    4. "category": główna kategoria zakupu (np. Spożywcze, Chemia/Kosmetyki, Elektronika, Odzież, Inne).
    5. "items": lista produktów, gdzie każdy produkt zawiera:
       - "name": nazwa produktu,
       - "price": cena łączna za dany produkt (float),
       - "qty": ilość (liczba),
       - "category": kategoria produktu (np. Nabiał, Pieczywo, Napoje, Chemia).

    Odpowiedz WYŁĄCZNIE poprawnym obiektem JSON.
  `;

  // Zaktualizowano nazwę modelu na aktywny gemini-3-flash-preview
  const MODEL_NAME = 'gemini-3-flash-preview';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { 
            inline_data: { 
              mime_type: file.type || 'image/jpeg', 
              data: base64Image 
            } 
          }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Błąd komunikacji z API Gemini.');
  }

  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  
  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanJson);
}