/* V.1
* Dieses Skript berechnet den Stromverbrauch aus Victron-Daten (Ampere, Volt)
* und speichert den Tagesverbrauch sowie einen Lebenszähler.
* Die Optimierung für den Raspberry Pi zielt auf die Schonung der SD-Karte ab.
* Das Skript ist jedoch plattformunabhängig und funktioniert auf jedem System mit ioBroker.
*
* Hauptmerkmale:
* - Exponential Moving Average (EMA) für eine geglättete, Echtzeit-Watt-Anzeige (nicht auf SD gespeichert).
* - Tagesverbrauch wird stündlich gesichert, um Datenverlust zu minimieren und die SD-Karte zu schonen.
* - Lebenszähler und tägliches Backup werden einmal täglich bei Mitternacht aktualisiert.
* - Manuelle Backup- und Restore-Funktionalität.
* - Filterung von Ausreißern durch einen minimalen Watt-Schwellenwert.
*/

// === Verbesserter Victron Tagesverbrauch & Lebenszähler ===

// Zielordner für das Skript
const base = "0_userdata.0.victron.lastausgang.";

// Quellen
const ampDP    = "mqtt.0.Victron.Load_current"; // A
const voltDP   = "mqtt.0.Victron.Voltage";      // V

// Hilfsvariablen
let lastCalculationTime = new Date().getTime();
let wattSecondsToday = 0; // Akkumulator für Wattsekunden heute
let lastWatt = 0; // Für die EMA-geglättete Watt-Anzeige
const alpha = 0.3; // EMA-Faktor
const MIN_WATT_THRESHOLD = 0.1; // Minimalwert

// Hilfsfunktion: Datenpunkte anlegen
function createDP(path, type="number", role="value", unit="", defVal=0) {
    if (!existsState(path)) {
        createState(path, defVal, {
            type: type,
            name: path.split(".").pop(),
            role: role,
            unit: unit
        });
    }
}

// Struktur anlegen
function setupStructure() {
    createDP(base+"verbrauch_aktuell", "number","value","kWh"); // Tagesverbrauch
    createDP(base+"verbrauch_aktuell_filtered", "number","value","kWh"); // Gefilterter Tagesverbrauch
    createDP(base+"verbrauch_gesamt", "number","value","kWh");   // Lebenszähler
    createDP(base+"aktuelle_watt", "number", "value", "W", 0);   // EMA Watt
    
    // Neuer Datenpunkt für manuelle Anpassung
    createDP(base+"anpassen_verbrauch_aktuell", "number", "level.value", "kWh", 0);

    // Backup & Restore (Datenpunkte bleiben, Backup-Frequenz wird über schedule geregelt)
    createDP(base+"backup", "string", "json", "");
    createDP(base+"backup_now", "boolean", "button", "", false);
    createDP(base+"restore_now", "boolean", "button", "", false);
    createDP(base+"last_backup_time", "string", "value", "", "");
}
setupStructure();

// === Backup-Funktion ===
function createBackup() {
    const now = new Date();
    const data = {
        timestamp: now.toISOString(),
        aktuell: getState(base+"verbrauch_aktuell").val || 0,
        wattSeconds: wattSecondsToday,
        gesamt: getState(base+"verbrauch_gesamt").val || 0,
        lastCalculationTime: lastCalculationTime
    };
    setState(base+"backup", JSON.stringify(data), true);
    setState(base+"last_backup_time", now.toISOString(), true);
    log("Backup erstellt: " + JSON.stringify(data));
}

// === Restore-Funktion ===
function restoreBackup() {
    const backupData = getState(base+"backup").val;
    if (!backupData) { log("Kein Backup vorhanden."); return; }

    let data;
    try { data = JSON.parse(backupData); } 
    catch (e) { log("Backup konnte nicht gelesen werden: " + e); return; }

    setState(base+"verbrauch_aktuell", data.aktuell || 0, true);
    wattSecondsToday = data.wattSeconds || 0;
    lastCalculationTime = data.lastCalculationTime || new Date().getTime();
    setState(base+"verbrauch_gesamt", data.gesamt || 0, true);
    log("Backup erfolgreich wiederhergestellt!");
}

// === Intervall-basierte Verbrauchsberechnung (alle 1 Sekunde) ===
// Daten werden in Variablen gehalten, Schreibvorgänge sind getaktet
setInterval(() => {
    let amp = getState(ampDP).val;
    let volt = getState(voltDP).val;

    // Fehlerbehandlung: fehlende Werte
    if (typeof amp !== 'number' || isNaN(amp)) amp = 0;
    if (typeof volt !== 'number' || isNaN(volt)) volt = 0;

    const currentWatt = amp * volt;
    const now = new Date().getTime();
    const timeDeltaSeconds = (now - lastCalculationTime) / 1000;
    lastCalculationTime = now;

    // Akkumulieren nur, wenn Watt >= 0
    if (currentWatt >= 0) {
        wattSecondsToday += currentWatt * timeDeltaSeconds;
    }

    // EMA für Watt-Anzeige
    // WICHTIG: setState mit 'false', damit es nicht auf die SD-Karte geschrieben wird
    lastWatt = alpha * currentWatt + (1 - alpha) * lastWatt;
    setState(base+"aktuelle_watt", Math.round(lastWatt), false); 

}, 1000);

// === Stündliche Speicherung des Tagesverbrauchs ===
// Schreibt den aktuellen Tagesverbrauch einmal pro Stunde auf die SD-Karte
schedule("0 * * * *", function () {
    const kWhToday = parseFloat((wattSecondsToday / 3600 / 1000).toFixed(3));
    setState(base+"verbrauch_aktuell", kWhToday, true);

    // Korrektur: Werte hier direkt abrufen, um den aktuellen Stand zu erhalten
    let amp = getState(ampDP).val;
    let volt = getState(voltDP).val;
    let currentWatt = amp * volt;

    // Gefilterter Tagesverbrauch: Werte < MIN_WATT_THRESHOLD werden auf vorherigen Wert gesetzt
    // Dieser Wert wird nur stündlich aktualisiert
    let kWhFiltered = kWhToday;
    if (currentWatt < MIN_WATT_THRESHOLD) {
        kWhFiltered = getState(base+"verbrauch_aktuell_filtered").val || 0;
    }
    setState(base+"verbrauch_aktuell_filtered", kWhFiltered, true);

    log("Stündliche Sicherung des Tagesverbrauchs: " + kWhToday + " kWh");
});


// === Lebenszähler einmal täglich aktualisieren (23:59) ===
schedule("59 23 * * *", function () {
    const gesamt = getState(base+"verbrauch_gesamt").val || 0;
    const tagesverbrauch = getState(base+"verbrauch_aktuell").val || 0;

    setState(base+"verbrauch_gesamt", parseFloat((gesamt + tagesverbrauch).toFixed(3)), true);
    setState(base+"verbrauch_aktuell", 0, true);
    wattSecondsToday = 0;

    // Führe das tägliche Backup durch, nachdem der Tageszähler auf Null gesetzt wurde
    createBackup();

    log("Lebenszähler aktualisiert und tägliches Backup erstellt.");
});

// === Backup/Restore Buttons ===
on({id: base+"backup_now", change: "any"}, (obj) => {
    if (obj.state.val === true) {
        createBackup();
        setState(base+"backup_now", false, true);
        log("Manuelles Backup erstellt.");
    }
});

on({id: base+"restore_now", change: "any"}, (obj) => {
    if (obj.state.val === true) {
        restoreBackup();
        setState(base+"restore_now", false, true);
        log("Backup wiederhergestellt.");
    }
});

// --- Manuelle Anpassung des Tagesverbrauchs ---
on({id: base+"anpassen_verbrauch_aktuell", change: "any"}, function (obj) {
    const newKWh = obj.state.val;
    if (typeof newKWh === 'number' && newKWh >= 0) {
        wattSecondsToday = newKWh * 1000 * 3600;
        setState(base+"verbrauch_aktuell", newKWh, true);
        setState(base+"verbrauch_aktuell_filtered", newKWh, true);
        log("Tagesverbrauch manuell auf " + newKWh + " kWh gesetzt. Interner Zähler angepasst.");
    } else {
        log("Ungültiger Wert für die manuelle Anpassung.", "warn");
    }
});
