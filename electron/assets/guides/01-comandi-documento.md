# Comandi nei documenti

Nei file `.md` dell'avventura puoi inserire comandi speciali che diventano bottoni cliccabili nel Viewer.

## Telegram `[tlg]`

Invia messaggi **scritti da te** ai giocatori via Telegram. Formati:

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

Il bottone appare **dorato** nel documento. Al click si apre la finestra di invio Telegram.

## Guida AI `[ai]`

Fa **generare all'AI** un messaggio personalizzato per il giocatore e lo invia via Telegram. Differenza con `[tlg]`: il testo non lo scrivi tu, lo scrive l'AI **coerente con i documenti attivi del PG**, il file `_prompt` (se presente) e lo storico della conversazione. Tu dai solo l'indicazione.

```
[ai|destinatario|indicazione per l'AI]
[ai::destinatario::indicazione per l'AI]
```

**Destinatari**: come `[tlg]` — nome PG, `Tutti`, `Casuale`, `Casuale:2`, `Casuale:meta`.

**Esempi**:

```
[ai|Mario|Insinua che sente un odore di zolfo nell'aria]
[ai|Tutti|Accenna al fatto che il drago potrebbe essere vicino]
[ai|Casuale|Suggerisci un ricordo d'infanzia legato al bosco]
[ai|Mario|Fai sentire la voce del vecchio stregone che lo chiama per nome]
```

**Cosa succede al click**:

1. Si apre una finestra con l'indicazione (modificabile) e i destinatari preselezionati
2. Per ogni destinatario selezionato, l'AI genera un messaggio usando:
   - I **documenti attivi** comuni e del PG specifico (escluso `_msg_*`)
   - Il file `_prompt` del PG come system prompt (se presente)
   - Lo **storico conversazioni** del PG (ultimi 30 messaggi)
   - L'**identità del PG** (nome personaggio)
3. La risposta dell'AI viene inviata via Telegram al giocatore e salvata nello storico

Il bottone appare **viola/magenta** nel documento (icona 🤖).

**Nota**: funziona solo se il bot Telegram è attivo e la **AI Telegram è abilitata** in Settings → AI.

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

Il bottone appare **azzurro** nel documento. Per le immagini hai due bottoni: anteprima (verifica prima) e invio diretto.

## Combinare tutti i comandi

I tre comandi si combinano per gestire cosa vedono, leggono e ricevono i giocatori:

```
[cast|mappe/foresta.jpg|La foresta oscura]
[tlg|Tutti|Vi trovate davanti a una foresta impenetrabile]
[ai|Mario|Fai parlare lo spirito del bosco che risponde alla sua domanda precedente sul sentiero sicuro]
[cast|Tre sentieri si aprono davanti a voi. Quale scegliete?]
[cast|blank]
```

## Come creare i bottoni

I bottoni si creano semplicemente scrivendo il comando **in qualsiasi punto del testo del documento `.md`**. Non servono virgolette, tag speciali, né configurazioni. Appena salvi e apri il file nel Viewer, il testo viene sostituito da un bottone cliccabile.

**Regole generali**:
- Il comando va su una riga o inline — funziona in entrambi i casi
- Separatore **pipe** `|` oppure **doppio due-punti** `::` (equivalenti)
- I percorsi delle immagini sono relativi alla cartella del progetto
- Il testo del messaggio può contenere tutti i caratteri tranne `|`, `::` e `]`
- Puoi mettere più bottoni vicini o in mezzo al testo narrativo

**Riepilogo colori**:

| Comando | Colore | Azione |
|---------|--------|--------|
| `[tlg]` | Dorato | Invii tu il testo via Telegram |
| `[ai]`  | Viola  | L'AI genera e invia via Telegram |
| `[cast]`| Azzurro| Invia al display secondario LAN |

## Prompt AI per generare i comandi

Copia il testo qui sotto e dallo a un'AI (ChatGPT, Claude) insieme al tuo documento di avventura per generare automaticamente i comandi:

---

Sei un assistente per un Game Master. Devi inserire comandi speciali in un documento Markdown di avventura.

Comandi disponibili:

```
1. [tlg|destinatario|contenuto] — GM invia messaggio Telegram diretto ai giocatori.
   Destinatari: nome PG, "Tutti", "Casuale", "Casuale:2".

2. [ai|destinatario|indicazione] — L'AI genera un messaggio proattivo al giocatore
   coerente con i documenti del PG. L'indicazione è un'istruzione all'AI,
   non il testo finale. Destinatari come sopra.

3. [cast|testo] — Mostra testo grande sul display secondario al tavolo.

4. [cast|percorso/immagine.jpg] — Mostra immagine sul display.
   Aggiungi didascalia: [cast|immagine.jpg|Descrizione].

5. [cast|blank] — Schermo nero sul display.
```

Regole:
- Usa `[tlg]` per messaggi espliciti e fissi (sensazioni descritte, messaggi segreti del GM).
- Usa `[ai]` quando vuoi che l'AI interpreti un personaggio/voce coerente con la lore
  (es. parlano i PNG, un fantasma, un oracolo). L'AI usa i documenti attivi del PG.
- Usa `[cast]` per contenuti visivi condivisi al tavolo (mappe, illustrazioni, enigmi,
  testi narrativi in evidenza).
- Inserisci `[cast|blank]` alla fine di ogni scena per pulire il display.
- I percorsi delle immagini sono relativi alla cartella del progetto.

Inserisci i comandi appropriati nel documento che ti fornisco.

---
