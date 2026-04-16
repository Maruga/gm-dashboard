# Comandi nei documenti

Nei file `.md` dell'avventura puoi inserire comandi speciali che diventano bottoni cliccabili nel Viewer.

## Telegram `[tlg]`

Invia messaggi ai giocatori via Telegram. Formati:

```
[tlg|destinatario|contenuto]
[tlg::destinatario::contenuto]
```

**Destinatari**: nome del PG, `Tutti`, `Casuale`, `Casuale:2`, `Casuale:meta`.

**Esempi**:

```
[tlg|Tutti|Il drago ruggisce ferocemente!]
[tlg|Mario|Senti un brivido lungo la schiena]
[tlg|Casuale|Una voce sussurra il tuo nome]
[tlg|Tutti|mappe/cripta.jpg]
```

Il bottone appare dorato nel documento. Al click si apre la finestra di invio Telegram.

## Display secondario `[cast]`

Invia contenuti al display dei giocatori (tablet/TV). Formati:

```
[cast|testo da mostrare]
[cast|percorso/immagine.jpg]
[cast|percorso/immagine.jpg|Descrizione]
[cast|blank]
```

**Tipi auto-rilevati**:
- File `.jpg .png .gif .webp .bmp` = immagine (mostra anteprima + invio)
- `blank` o `nero` = schermo nero
- Tutto il resto = testo grande sul display

**Esempi**:

```
[cast|Benvenuti nella cripta del re]
[cast|mappe/sala-trono.jpg|La sala del trono]
[cast|mappe/enigma.png|L'enigma sulla porta]
[cast|blank]
```

Il bottone appare azzurro nel documento. Per le immagini hai due bottoni: anteprima (verifica prima) e invio diretto.

## Combinare Telegram e Display

Usa entrambi nello stesso documento per gestire cosa vedono i giocatori:

```
[cast|mappe/foresta.jpg|La foresta oscura]
[tlg|Tutti|Vi trovate davanti a una foresta impenetrabile]
[tlg|Mario|Il tuo spirito reagisce: pericolo!]
[cast|Tre sentieri si aprono davanti a voi. Quale scegliete?]
[cast|blank]
```

## Prompt AI

Copia il testo qui sotto e dallo a un'AI (ChatGPT, Claude) insieme al tuo documento di avventura per generare automaticamente i comandi:

---

Sei un assistente per un Game Master. Devi inserire comandi speciali in un documento Markdown di avventura.

Comandi disponibili:

```
1. [tlg|destinatario|contenuto] — invia messaggio Telegram ai giocatori. Destinatari: nome PG, "Tutti", "Casuale", "Casuale:2".
2. [cast|testo] — mostra testo grande sul display secondario al tavolo.
3. [cast|percorso/immagine.jpg] — mostra immagine sul display. Aggiungi descrizione: [cast|immagine.jpg|Descrizione].
4. [cast|blank] — schermo nero sul display.

Regole:
- Usa [tlg] per informazioni personali o di gruppo ai giocatori (sensazioni, messaggi segreti)
- Usa [cast] per contenuti visivi condivisi al tavolo (mappe, illustrazioni, enigmi, testi narrativi)
- Inserisci [cast|blank] alla fine di ogni scena per pulire il display
- I percorsi delle immagini sono relativi alla cartella del progetto

Inserisci i comandi appropriati nel documento che ti fornisco.
```

---
