# File e cartelle speciali

Alcuni file e cartelle hanno un significato particolare per la Dashboard.

## File `_prompt*`

Un file il cui nome inizia con `_prompt` (es. `_prompt-spirito.md`) viene usato come **istruzioni per l'AI** di Telegram. Il contenuto dice all'AI chi interpretare e come comportarsi.

- Va aggiunto tra i documenti AI del PG (Impostazioni > Documenti AI)
- Non viene passato come contesto (evita duplicazione)
- Se presente, sostituisce il prompt generico "assistente avventura"
- Se assente, l'AI risponde come assistente del GM

**Esempio** `_prompt-caesar.md`:
```
Sei Caesar, una Salamandra di Fuoco legata a Titus.
Parla in prima persona, in modo diretto e caloroso.
Rivolgiti a Titus con "tu".
Non rompere mai il personaggio.
```

## File `_msg_*`

File il cui nome inizia con `_msg_` (es. `_msg_iniziale_spirito.md`) sono **messaggi speciali** inviabili manualmente dal GM ai PG via Telegram.

- Appaiono come chip nella barra sopra la chat del PG in TelegramChat
- Il contenuto viene inviato testualmente al giocatore
- Non fanno parte del contesto AI (esclusi come `_prompt`)
- Tracciamento invii: contatore, data ultimo invio, reset singolo/gruppo

**Naming**: `_msg_` + nome descrittivo. Gli underscore diventano spazi nel bottone (es. `_msg_iniziale_spirito` = "iniziale spirito").

## Cartella `_assets/`

Cartella di sistema per asset dell'app (non dell'avventura):

```
_assets/
  sounds/           ← suoni dadi (single*.mp3, few*.mp3, many*.mp3)
  media/
    passepartout/   ← sfondi display secondario
```

- Visibile nell'Explorer, puoi trascinarci file
- Creata automaticamente da "Importa asset predefiniti" (Impostazioni > Casting)
- Portata con l'avventura se esporti il progetto

**Suoni dadi**: nome del file determina la categoria.
- `single.mp3`, `single_1.mp3`, ... = 1 dado
- `few.mp3`, `few_1.mp3`, ... = 2-3 dadi
- `many.mp3`, `many_1.mp3`, ... = 4+ dadi

Il sistema sceglie casualmente tra i sample della categoria.
