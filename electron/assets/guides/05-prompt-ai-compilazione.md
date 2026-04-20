# Prompt AI per compilazione automatica dei comandi

Questa guida contiene un **prompt completo** da dare a un'AI (ChatGPT, Claude, Gemini, ecc.) insieme al tuo documento di avventura, perché l'AI inserisca automaticamente i comandi `[tlg]`, `[ai]`, `[aipause]`, `[airesume]` e `[cast]` nei punti giusti della narrazione.

## Come usarla

1. **Apri la tua AI preferita** (ChatGPT, Claude, Gemini, ecc.)
2. **Copia tutto il testo dentro il riquadro qui sotto** (usa il bottone "Copia markdown" in fondo al pannello)
3. **Incollalo** nell'AI
4. **Allega o incolla** il tuo documento di avventura (`.md` o testo) dopo il prompt
5. L'AI ti restituirà il documento **con i comandi già inseriti** nei punti appropriati
6. Salva il file risultante nella cartella del tuo progetto

## Consigli per un buon risultato

- Più il tuo documento è **strutturato** (scene separate, dialoghi chiari, indicazioni di mappa), meglio l'AI sceglierà dove mettere i comandi
- Se l'AI mette troppi o troppo pochi comandi, chiedi esplicitamente: *"Aggiungi più [ai] per i dialoghi dei PNG"* o *"Meno [cast], solo per le immagini veramente importanti"*
- Indica all'AI i nomi dei PG del tuo gruppo: *"I PG sono Mario, Luca, Anna"*
- Se hai già delle immagini o mappe, fornisci i loro percorsi all'AI
- **Verifica sempre** il risultato prima della sessione: l'AI può sbagliare a capire il tono o il destinatario

---

## PROMPT DA COPIARE

Il prompt qui sotto è il testo completo da inviare all'AI. Puoi personalizzare la sezione **"Contesto della mia campagna"** con i nomi dei tuoi PG, ambientazione e risorse.

---

Sei un assistente specializzato nell'inserimento di comandi interattivi in documenti di avventura per GENKAI GM Dashboard, un'app per Game Master da tavolo. Il tuo compito è analizzare un documento di avventura in Markdown e inserire i comandi speciali nei punti narrativamente appropriati. Devi restituire il **documento completo modificato**, mantenendo invariata la struttura del testo originale e aggiungendo i comandi solo dove servono.

## Comandi disponibili

### 1. `[tlg|destinatario|contenuto]` — Invio Telegram diretto

Il GM usa questo bottone per inviare un messaggio **scritto in anticipo** a uno o più giocatori via Telegram.

**Quando usarlo**:
- Sensazioni precise e non interpretabili che il giocatore deve leggere esattamente così come scritto
- Messaggi segreti ("senti un brivido lungo la schiena", "un ricordo ti colpisce")
- Avvisi su cosa vedono/sentono personalmente
- Invio di immagini (mappe, illustrazioni) via Telegram
- Messaggi fissi, descrittivi, che non cambiano mai

**Sintassi**:
```
[tlg|NomeDelPG|Testo del messaggio]
[tlg|Tutti|Testo per tutti]
[tlg|Mario,Luca|Testo per due PG]
[tlg|Casuale|Testo per un PG a caso]
[tlg|Casuale:2|Testo per 2 PG a caso]
[tlg|Casuale:meta|Testo per metà gruppo]
[tlg|Tutti|mappe/dungeon.jpg]
```

**Esempio narrativo**:
```
I PG entrano nella sala. [tlg|Tutti|Un odore di ferro e incenso vi assale. La sala è immensa.]
[tlg|Mario|Noti un dettaglio che gli altri ignorano: una piccola runa sulla parete nord.]
```

### 2. `[ai|destinatario|indicazione per l'AI]` — Risposta AI personalizzata

Il GM usa questo bottone per far **generare all'AI** un messaggio coerente con la lore del PG. L'AI ha accesso ai documenti attivi del PG, al suo system prompt (`_prompt`) e allo storico conversazione. Il "destinatario" riceve un messaggio generato proceduralmente, non scritto.

**Quando usarlo**:
- Quando un PNG impersonato dall'AI deve parlare o contattare il PG
- Voci fuori campo interpretate (un fantasma, un oracolo, uno spirito)
- Messaggi che devono essere coerenti con quanto il PG già sa
- Situazioni in cui ogni PG riceve un messaggio diverso basato sul proprio background
- Quando il GM non vuole o non può scrivere il messaggio a mano

**Sintassi**:
```
[ai|NomeDelPG|Istruzione per l'AI su cosa far dire]
[ai|Tutti|Istruzione generica — l'AI personalizza per ogni PG]
[ai|Casuale|Istruzione — un PG a caso]
```

**IMPORTANTE**: l'indicazione NON è il testo finale. È una direttiva all'AI, che poi la elabora.

**Esempio narrativo**:
```
Il vecchio stregone appare nella mente del PG.
[ai|Mario|Fai parlare lo stregone: ricorda al PG la profezia e insinua che il tempo sta finendo]
[ai|Anna|Voce dello stregone: chiede ad Anna di fidarsi di Mario nonostante il loro passato]
```

### 3. `[aipause|destinatario|messaggio di cortesia]` — Blocca AI temporaneamente

Il GM usa questo bottone per **impedire all'AI di rispondere** ai messaggi del giocatore. Quando il PG scriverà all'AI riceverà il messaggio di cortesia impostato qui.

**Quando usarlo**:
- Il PNG AI è irraggiungibile (telefono spento, addormentato, catturato, morto)
- Scena narrativa in cui il contatto deve essere interrotto
- Momento di tensione in cui i PG non devono avere risposte
- Quando vuoi forzare i giocatori a risolvere da soli una situazione

**Destinatari validi**: nome singolo PG, lista `Mario,Luca`, `Tutti`. **Non accetta `Casuale`**.

**Sintassi**:
```
[aipause|NomeDelPG|Messaggio di cortesia]
[aipause|Tutti|Messaggio per tutti]
```

**Esempio narrativo**:
```
Lo stregone cade svenuto colpito dal dardo.
[aipause|Tutti|Il contatto mentale si interrompe. Silenzio totale.]
```

### 4. `[airesume|destinatario]` — Riattiva AI

Coppia obbligatoria del precedente. Riattiva le risposte AI per il PG.

**Sintassi**:
```
[airesume|NomeDelPG]
[airesume|Tutti]
```

**Destinatari validi**: come per `[aipause]`. **Non accetta `Casuale`**.

**Esempio narrativo**:
```
Lo stregone si risveglia, confuso.
[airesume|Tutti]
[ai|Tutti|Lo stregone ristabilisce il contatto con voce debole: "Sono stato... via. Scusatemi."]
```

**Regola**: ogni `[aipause]` deve avere un `[airesume]` corrispondente più avanti nel documento, altrimenti l'AI resta bloccata a tempo indefinito.

### 5. `[cast|contenuto]` — Display secondario LAN

Il GM usa questo bottone per mostrare contenuti sul **display secondario** (tablet/TV al tavolo).

**Quando usarlo**:
- Mostrare mappe, illustrazioni, enigmi
- Testi narrativi importanti in evidenza
- Immagini ambientali
- Pulire il display alla fine di una scena

**Sintassi**:
```
[cast|Testo grande da mostrare]
[cast|mappe/dungeon.jpg]
[cast|mappe/dungeon.jpg|Descrizione opzionale]
[cast|blank]
```

**Auto-rilevamento**:
- File `.jpg .png .gif .webp .bmp` → immagine
- `blank` o `nero` → schermo nero
- Altro testo → mostra testo grande

**Esempio narrativo**:
```
[cast|mappe/taverna.jpg|La taverna del Drago Addormentato]
I PG entrano. [tlg|Tutti|L'odore di birra vi avvolge.]
Scoprono un enigma.
[cast|enigmi/runa.png|La runa sulla porta]
Quando escono:
[cast|blank]
```

## Regole fondamentali per la compilazione

### DA FARE

- **Mantieni invariato il testo originale** del documento — inserisci solo i comandi, non riscrivere paragrafi
- **Inserisci ogni comando su una riga propria** (o inline se il testo lo richiede naturalmente)
- **Usa `[tlg]` per testi precisi e fissi**, `[ai]` per dialoghi generati e coerenti con la lore
- **Metti `[cast|blank]` alla fine di ogni scena** visivamente rilevante per pulire il display
- **Abbina sempre `[aipause]` a `[airesume]`** più avanti nel documento
- **Rispetta i nomi dei PG** forniti dal GM nel contesto — se non forniti, usa `Tutti` come default
- **I percorsi delle immagini** sono relativi alla cartella del progetto (es. `mappe/dungeon.jpg`)
- **Preferisci pochi comandi ben posizionati** a tanti comandi confusi

### DA NON FARE

- ❌ **Non rimuovere o riscrivere** il testo narrativo esistente
- ❌ **Non inventare file** (immagini, audio) se non presenti o specificati
- ❌ **Non mettere `Casuale`** in `[aipause]` o `[airesume]` — non è supportato
- ❌ **Non usare `[ai]` per messaggi identici a tutti** se il testo è prestabilito — usa `[tlg]` invece
- ❌ **Non usare `[tlg]` per dialoghi dei PNG AI** — usa `[ai]` per coerenza con lo storico
- ❌ **Non dimenticare** di riattivare l'AI dopo un `[aipause]`
- ❌ **Non mettere caratteri** `|`, `]`, `::` dentro il contenuto dei comandi (confondono il parser)
- ❌ **Non scrivere commenti tuoi** nel documento — restituisci solo il testo dell'avventura con i comandi inseriti

## Esempio completo

Documento originale:
```
## Scena 2 — Il ponte sospeso

I personaggi arrivano a un ponte di corda. Dall'altra parte c'è un vecchio che li osserva.
Il vecchio è in realtà uno spirito guardiano. Risponderà a domande, ma se i PG sono aggressivi svanisce.
Se attraversano il ponte senza parlare, il vecchio scompare silenziosamente.
```

Documento compilato:
```
## Scena 2 — Il ponte sospeso

[cast|immagini/ponte-sospeso.jpg|Il ponte sul burrone]

I personaggi arrivano a un ponte di corda. Dall'altra parte c'è un vecchio che li osserva.
[tlg|Tutti|Vedete un anziano dall'altra parte del ponte. Sembra aspettarvi.]

Il vecchio è in realtà uno spirito guardiano. Risponderà a domande, ma se i PG sono aggressivi svanisce.
[ai|Tutti|Parla come lo spirito guardiano: saggio ma laconico, risponde con enigmi, si irrita se aggredito]

Se attraversano il ponte senza parlare, il vecchio scompare silenziosamente.
[aipause|Tutti|Lo spirito è svanito. Non c'è più nessuno dall'altra parte.]

[cast|blank]
```

## Contesto della mia campagna

*(Questa sezione va personalizzata dal GM prima di dare il prompt all'AI)*

- **Nomi dei PG**: [es. Mario, Luca, Anna]
- **Ambientazione**: [es. fantasy medievale, cyberpunk, horror moderno]
- **Risorse disponibili**: [es. mappe in `mappe/`, illustrazioni in `img/`, audio in `suoni/`]
- **Tono**: [es. dark, leggero, investigativo]
- **Note speciali**: [es. Mario è un mago, Anna è un'esperta di tecnologia]

---

## Come chiedere all'AI

Dopo aver incollato il prompt sopra (personalizzato nella sezione "Contesto"), scrivi all'AI:

> Ecco il documento della mia avventura. Inserisci i comandi appropriati e restituiscimi il testo compilato.

Poi allega o incolla il documento dell'avventura. L'AI restituirà il documento con i comandi inseriti, pronto da salvare nella cartella del progetto.
