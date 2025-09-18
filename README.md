# Victron Load Monitor / Victron Lastmonitor

## Deutsch
**Genaues Monitoring des Victron-Lastausgangs, Tages- und Gesamtverbrauch, inklusive EMA-Glättung, Backup und Ausreißerfilter.**

### Funktionen
- Echtzeitüberwachung der aktuellen Last (W) mit EMA-Glättung
- Tagesverbrauch in kWh akkumulieren
- Gesamtverbrauch über die Zeit erfassen (Lebenszähler)
- Kurzzeitige Ausreißer oder 0-Werte filtern für höhere Genauigkeit
- Manuelle Anpassung des Tagesverbrauchs möglich
- Backup- und Restore-Funktion für sichere Datensicherung
- Geeignet für kleine Lastpunkte, sensibel für kleine Schwankungen

### Installation
1. Skript in den ioBroker Scripts-Ordner kopieren
2. MQTT-Datenpunkte für Strom und Spannung an dein System anpassen
3. Basisordner im Script einstellen (`0_userdata.0.victron.lastausgangpt.`)
4. Script starten und Tagesverbrauch beobachten

### Nutzung
- `verbrauch_aktuell` für Tagesverbrauch beobachten
- `verbrauch_gesamt` für Lebenszähler beobachten
- `anpassen_verbrauch_aktuell` für manuelle Anpassung des Tagesverbrauchs verwenden
- `backup_now` und `restore_now` Buttons verwenden, um Daten zu sichern oder wiederherzustellen

### Hinweise
- Am besten geeignet für kleine Lastpunkte, wo kleine Schwankungen relevant sind
- Für Tests und schrittweise Integration in größere Monitoring-Systeme konzipiert
- Täglicher Reset sorgt für langfristige Stabilität

### Lizenz
MIT-Lizenz

## English
**Precise monitoring of Victron load, daily and total consumption, with EMA smoothing, backup, and outlier filtering.**

### Features
- Real-time monitoring of current load (W) with EMA smoothing
- Accumulate daily consumption in kWh
- Track total consumption over time (life counter)
- Filter out short-term spikes or zero-values to improve accuracy
- Manual adjustment of daily consumption
- Backup & restore functionality for safe data storage
- Works with small load points, sensitive to minor fluctuations

### Installation
1. Copy the script to your ioBroker scripts folder
2. Adjust the MQTT datapoints for current and voltage to match your system
3. Set up the desired base folder in the script (`0_userdata.0.victron.lastausgangpt.`)
4. Run the script and observe the daily consumption

### Usage
- Observe the `verbrauch_aktuell` datapoint for daily consumption
- Observe `verbrauch_gesamt` for the life counter
- Use `anpassen_verbrauch_aktuell` to manually adjust daily kWh
- Press `backup_now` and `restore_now` buttons to save or restore data

### Notes
- Works best with small load points where minor fluctuations are relevant
- Designed for testing and gradual integration into larger monitoring setups
- Daily reset ensures long-term stability

### License
MIT License
