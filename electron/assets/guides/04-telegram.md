# Telegram — Comunicazione con i giocatori

Integrazione con un bot Telegram per comunicare con i PG durante la sessione.

## Configurazione

1. Crea un bot su Telegram parlando con @BotFather
2. Copia il token del bot
3. Impostazioni > Telegram > incolla il token > Verifica
4. Avvia il bot dalla Dashboard

## Connessione giocatori

1. Avvia il bot dalla Dashboard
2. I giocatori aprono il bot su Telegram
3. Inviano `/start` e poi il codice sessione mostrato nelle Impostazioni
4. Il GM vede i giocatori connessi nel pannello Chat (icona 💬 nel menu)

## Chat GM - Giocatori

Il pannello Chat mostra la lista dei PG connessi. Selezionando un PG:
- Vedi lo storico messaggi
- Puoi rispondere dal campo testo in basso
- I messaggi AI appaiono con icona robot

## AI per i PG

Impostazioni > Assistente AI > Telegram AI.

Quando attiva, l'AI risponde ai messaggi dei giocatori usando i documenti configurati. Due modalita:
- **Manuale**: il giocatore deve scrivere `/ai domanda`
- **Automatico**: l'AI risponde a tutti i messaggi

### Documenti AI

Impostazioni > Documenti AI.

- **Comuni**: visibili all'AI di tutti i PG
- **Per PG**: visibili solo all'AI di quel PG specifico

### Prompt personalizzato `_prompt*`

Se tra i documenti attivi c'e un file che inizia con `_prompt`, l'AI usa il suo contenuto come istruzioni. Vedi guida "File speciali".

### Prova AI

Console > tab "Prova PG": simula le domande di un giocatore senza bisogno di Telegram. Stessi documenti, stesso prompt. Storico di prova separato da quello reale.

## Messaggi speciali `_msg_*`

Messaggi predefiniti inviabili manualmente dal GM. Appaiono come chip sopra la chat del PG.

1. Crea un file `_msg_iniziale.md` (o qualsiasi nome con prefisso `_msg_`)
2. Aggiungilo tra i documenti AI del PG
3. Nella chat, clicca il chip per inviarlo

Tracciamento: contatore invii, data ultimo invio, reset singolo o gruppo.

Vedi guida "File speciali" per dettagli sul naming.

## Comandi nei documenti

Puoi inserire bottoni Telegram direttamente nei file `.md` dell'avventura:

```
[tlg|Tutti|Il drago ruggisce]
[tlg|Mario|Senti un sussurro]
```

Vedi guida "Comandi nei documenti" per tutti i formati e il prompt AI.

## Consultazione manuali

I giocatori possono consultare i manuali di riferimento via Telegram con il comando `.manuale parola`. Se l'AI e attiva, l'AI risponde basandosi sui manuali. Se disattivata, ricerca per parole chiave.
