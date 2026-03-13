# GUIDA RELEASE — GENKAI GM Dashboard

Procedura per pubblicare una nuova release:

## 1. Incrementa versione
Apri package.json e incrementa la versione seguendo semver:
- Patch (1.0.0 → 1.0.1): bugfix
- Minor (1.0.0 → 1.1.0): nuove funzionalità
- Major (1.0.0 → 2.0.0): cambiamenti drastici

## 2. Commit e push
```bash
git add -A
git commit -m "Release vX.X.X"
git push
```

## 3. Build installer
```bash
npm run dist
```
L'output va in cartella release/. Verifica che esista:
- GENKAI GM Dashboard Setup X.X.X.exe
- latest.yml

## 4. Pubblica su GitHub Releases
```bash
gh release create vX.X.X "release/GENKAI GM Dashboard Setup X.X.X.exe" "release/latest.yml" --title "GENKAI GM Dashboard vX.X.X" --notes "Descrizione delle modifiche"
```

> **Nota:** gh CLI è già installato sul sistema. Se il comando non viene trovato, verificare che il path sia configurato o riavviare il terminale.

## 5. Verifica auto-update
L'app installata con la versione precedente deve ricevere la notifica di aggiornamento entro pochi secondi dall'avvio. Il toast "Aggiornamento vX.X.X pronto" appare in basso.

## Note
- Il file latest.yml è OBBLIGATORIO — electron-updater lo usa per verificare la versione
- Il tag deve iniziare con "v" (es. v1.1.0)
- Le release delle avventure usano tag diversi: adventure-nome-vX.X
