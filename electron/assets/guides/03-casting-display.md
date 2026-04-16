# Casting — Display al tavolo

Mostra immagini, testi e tiri di dado su un secondo dispositivo (tablet, TV, laptop) collegato alla stessa rete Wi-Fi.

## Avvio rapido

1. Clicca **📡** nella barra in alto per aprire il pannello Casting
2. Clicca **Avvia server** (porta default: 1804)
3. Sul tablet/telefono apri l'URL mostrato nel pannello (o scansiona il QR)
4. Inizia a inviare contenuti

## Inviare contenuti

**Dal pannello Casting**: campo testo + bottone Invia (testo libero).

**Dall'Explorer**: click destro su file immagine > "📡 Invia al display".

**Dall'Explorer**: click destro su file .md/.txt > "📡 Invia testo al display".

**Dall'overlay immagine**: icona 📡 in alto a destra (visibile solo se server attivo).

**Dal documento**: comandi `[cast]` — vedi guida "Comandi nei documenti".

**Dal pannello dadi**: clicca un risultato per mostrarlo sul display. Click rapidi accumulano i dadi e vengono inviati insieme dopo una breve pausa.

**Schermo nero**: bottone "Schermo vuoto" nel pannello Casting.

## Passepartout

Sfondo mostrato quando il display si collega per la prima volta. Si imposta da Impostazioni > Casting > Sfondo passepartout. Puoi scegliere tra le immagini in `_assets/media/passepartout/`.

Nota: "Schermo vuoto" rende lo schermo nero, non torna al passepartout.

## Dadi sul display

Clicca un risultato nel pannello dadi per inviarlo al display. Se clicchi più dadi rapidamente (entro 800ms), vengono raggruppati e mostrati insieme con il suono appropriato.

Animazione: i numeri ruotano per mezzo secondo prima di fermarsi. Se il risultato e un critico o fallimento (configurabile), dopo il fermo esplode il colore con la scritta.

## Regole critico/fallimento

Impostazioni > Casting > tabella "Regole critico/fallimento".

Per ogni dado (d4-d100) puoi scegliere:
- **Critico quando esce**: Nessuno / Massimo / 1
- **Fallimento quando esce**: Nessuno / Massimo / 1
- Etichette personalizzabili

Esempio D&D: d20 Critico=Massimo, Fallimento=1.
Esempio Genkai: d6 Critico=1, Fallimento=Massimo.

## Suoni

Impostazioni > Casting > Suoni dadi.

- **Sorgente**: PC (casse del GM) o Display (tablet)
- I suoni sono in `_assets/sounds/` con naming `single*.mp3`, `few*.mp3`, `many*.mp3`
- Il sistema sceglie casualmente in base al numero di dadi

## Transizioni

Impostazioni > Casting > Tipo transizione.

- **Dissolvenza**: crossfade con durata configurabile (0-1000ms)
- **Stacco**: cambio istantaneo

## Rete

- Il display deve essere sulla stessa rete Wi-Fi del computer
- Se usi VPN (es. NordVPN), disattivala durante il gioco
- Seleziona l'IP corretto dal dropdown nel pannello (quello del Wi-Fi, non di VirtualBox/Docker)
- Chrome e Safari funzionano. Brave richiede di disattivare HTTPS Upgrade
