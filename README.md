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
## Deutsch
1. Öffne ioBroker Admin im Browser.
2. Gehe zu **Skripte → JavaScript**.
3. Erstelle ein neues Skript und wähle **JavaScript** als Typ aus.
4. Öffne die `.js` Datei mit dem Skript-Code und kopiere den gesamten Inhalt.
5. Füge den Inhalt in das neue JavaScript-Skriptfenster ein.
6. Speichern und den Schieberegler auf „Ein“ setzen, um das Skript zu aktivieren.
7. Prüfe die Werte in Echtzeit und beobachte die Datenpunkte (`verbrauch_aktuell`, `verbrauch_gesamt`, `aktuelle_watt`).
8. # MQTT Data Source / MQTT Datenquelle
Die MQTT-Datenpunkte (`mqtt.0.Victron.Load_current` und `mqtt.0.Victron.Voltage`) stammen von einem **ESP82XX Mikrocontroller**, auf dem die Firmware **Victron2MQTT** läuft.  
Stelle sicher, dass dein ESP82XX korrekt konfiguriert ist und die Daten an ioBroker gesendet werden, bevor du das Skript startest.



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
. Open ioBroker Admin in your browser.
2. Go to **Scripts → JavaScript**.
3. Create a new script and select **JavaScript** as the type.
4. Open the `.js` file and copy all the content.
5. Paste the content into the new JavaScript script window.
6. Save and toggle the script to "On" to activate it.
7. Check the real-time values and monitor the datapoints (`verbrauch_aktuell`, `verbrauch_gesamt`, `aktuelle_watt`).
8. The MQTT datapoints (`mqtt.0.Victron.Load_current` and `mqtt.0.Victron.Voltage`) come from an **ESP82XX microcontroller** running the **Victron2MQTT firmware**.  
Make sure your ESP82XX is properly configured and sending data to ioBroker before starting the script.





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

## 24-Stunden Test-Checkliste / 24-Hour Test Guide

### Deutsch
Um sicherzustellen, dass das Skript zuverlässig läuft:

1. Starte das Skript in ioBroker.
2. Beobachte `verbrauch_aktuell` über 24 Stunden, prüfe, ob die Werte plausibel steigen.
3. Prüfe `verbrauch_gesamt`, dass der Lebenszähler korrekt hochgezählt wird.
4. Achte auf kurzzeitige Ausreißer oder 0-Werte, ggf. mit der Filterfunktion prüfen.
5. Teste die Buttons `backup_now` und `restore_now` einmal, um sicherzugehen, dass Backup/Restore funktioniert.
6. Am Ende der 24 Stunden: Werte prüfen und mit der Victron-App vergleichen.
7. Notiere Auffälligkeiten, um später Anpassungen vorzunehmen.

### English
To ensure the script runs reliably:

1. Start the script in ioBroker.
2. Monitor `verbrauch_aktuell` over 24 hours and check that values increase plausibly.
3. Check `verbrauch_gesamt` to ensure the life counter increments correctly.
4. Watch for short-term spikes or zero-values; use the filter function if necessary.
5. Test the `backup_now` and `restore_now` buttons once to ensure backup/restore works.
6. At the end of 24 hours, compare values with the Victron app.
7. Record any anomalies for later adjustments.

