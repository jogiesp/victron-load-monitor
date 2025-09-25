/*
* This script calculates power consumption from Victron data (Amperes, Volts)
* and stores the daily consumption as well as a lifetime counter.
* The optimization for Raspberry Pi aims to protect the SD card.
* However, the script is platform-independent and works on any system with ioBroker.
*
* Main features:
* - Exponential Moving Average (EMA) for a smoothed, real-time Watt display (not saved to SD).
* - Daily consumption is backed up every 10 minutes to minimize data loss and protect the SD card.
* - Lifetime counter and daily backup are updated once a day at midnight.
* - Manual backup and restore functionality.
* - Filtering of outliers with a minimal Watt threshold.
* Verbesserte Version des Victron-Tagesverbrauchskripts mit dynamischem Korrekturfaktor.
* Hintergrund: Victron-Werte weichen systematisch ab.
* Lösung: Korrekturfaktor (Offset) kann direkt über ioBroker angepasst werden.
*
*
* Victron Tagesverbrauch & Lebenszähler mit einmaligem Tages-Offset
* Optimiert für ioBroker / Raspberry Pi.
*/

// === Zielordner & Quellen ===
const base = "0_userdata.0.victron.lastausgangpt.";
const ampDP    = "mqtt.0.Victron.Load_current"; // A
const voltDP   = "mqtt.0.Victron.Voltage";      // V

// === Hilfsvariablen ===
let lastCalculationTime = new Date().getTime();
let wattSecondsToday = 0;      // echte gemessene Energie in Wattsekunden
let lastWatt = 0;              // EMA-Watt
const alpha = 0.3;             
const MIN_WATT_THRESHOLD = 0.1;

let offsetToday = 0;           // temporärer Tages-Offset

// === Hilfsfunktion: Datenpunkte anlegen ===
function createDP(path, type="number", role="value", unit="", defVal=0) {
    if (!existsState(path)) {
        createState(path, defVal, { type: type, name: path.split(".").pop(), role: role, unit: unit });
    }
}

// === Struktur anlegen ===
function setupStructure() {
    createDP(base+"verbrauch_aktuell","number","value","kWh");
    createDP(base+"verbrauch_aktuell_filtered","number","value","kWh");
    createDP(base+"verbrauch_gesamt","number","value","kWh");
    createDP(base+"aktuelle_watt","number","value","W",0);

    createDP(base+"anpassen_verbrauch_aktuell","number","level.value","kWh",0);
    createDP(base+"korrektur_offset","number","value","kWh",0);
    createDP(base+"offset_applied_day","string","value","","");

    createDP(base+"backup","string","json","");
    createDP(base+"backup_now","boolean","button",false);
    createDP(base+"restore_now","boolean","button",false);
    createDP(base+"last_backup_time","string","value","");
}
setupStructure();

// === Backup / Restore ===
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

// === Verbrauchsberechnung (jede Sekunde) ===
setInterval(() => {
    let amp = getState(ampDP).val;
    let volt = getState(voltDP).val;

    if (typeof amp !== 'number' || isNaN(amp)) amp = 0;
    if (typeof volt !== 'number' || isNaN(volt)) volt = 0;

    const currentWatt = amp * volt;
    const now = new Date().getTime();
    const timeDeltaSeconds = (now - lastCalculationTime) / 1000;
    lastCalculationTime = now;

    if (currentWatt >= 0) {
        wattSecondsToday += currentWatt * timeDeltaSeconds;
    }

    lastWatt = alpha * currentWatt + (1 - alpha) * lastWatt;
    setState(base+"aktuelle_watt", Math.round(lastWatt), false);
}, 1000);

// === Einmaliger Tages-Offset ===
function applyDailyOffset() {
    const today = new Date().toISOString().slice(0,10);
    const appliedDay = getState(base+"offset_applied_day").val || "";

    if (appliedDay !== today) {
        offsetToday = parseFloat(getState(base+"korrektur_offset").val) || 0;
        setState(base+"offset_applied_day", today, true);
        log("Offset von " + offsetToday + " kWh einmalig für heute aktiviert.");
    }
}

// === Tagesverbrauch speichern (jede Minute) ===
schedule("* * * * *", function () {
    applyDailyOffset();

    const kWhMeasured = wattSecondsToday / 3600 / 1000;
    const kWhToday = parseFloat((kWhMeasured + offsetToday).toFixed(3));
    setState(base+"verbrauch_aktuell", kWhToday, true);

    // Gefilterter Verbrauch
    let amp = getState(ampDP).val;
    let volt = getState(voltDP).val;
    let currentWatt = amp * volt;
    let kWhFiltered = kWhToday;
    if (currentWatt < MIN_WATT_THRESHOLD) {
        kWhFiltered = getState(base+"verbrauch_aktuell_filtered").val || 0;
    }
    setState(base+"verbrauch_aktuell_filtered", kWhFiltered, true);

    log("Tagesverbrauch inkl. Offset: " + kWhToday + " kWh");
});

// === Lebenszähler (23:59) ===
schedule("59 23 * * *", function () {
    const gesamt = getState(base+"verbrauch_gesamt").val || 0;
    const tagesverbrauch = getState(base+"verbrauch_aktuell").val || 0;

    setState(base+"verbrauch_gesamt", parseFloat((gesamt + tagesverbrauch).toFixed(3)), true);
    setState(base+"verbrauch_aktuell", 0, true);
    setState(base+"verbrauch_aktuell_filtered", 0, true);
    wattSecondsToday = 0;
    offsetToday = 0;

    createBackup();
    log("Lebenszähler aktualisiert und tägliches Backup erstellt.");
});

// === Backup / Restore Buttons ===
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

// === Manuelle Anpassung Tagesverbrauch ===
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
