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
*/

// === Enhanced Victron Daily Consumption & Lifetime Counter ===

// Target folder for the script
const base = "0_userdata.0.victron.loadoutput.";

// Sources
const ampDP    = "mqtt.0.Victron.Load_current"; // A
const voltDP   = "mqtt.0.Victron.Voltage";      // V

// Helper variables
let lastCalculationTime = new Date().getTime();
let wattSecondsToday = 0; // Accumulator for watt-seconds today
let lastWatt = 0; // For the EMA-smoothed Watt display
const alpha = 0.3; // EMA factor
const MIN_WATT_THRESHOLD = 0.1; // Minimum value

// Helper function: Create data points
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

// Setup structure
function setupStructure() {
    createDP(base+"current_consumption", "number","value","kWh"); // Daily consumption
    createDP(base+"current_consumption_filtered", "number","value","kWh"); // Filtered daily consumption
    createDP(base+"total_consumption", "number","value","kWh");   // Lifetime counter
    createDP(base+"current_watt", "number", "value", "W", 0);   // EMA Watt
    
    // New data point for manual adjustment
    createDP(base+"adjust_current_consumption", "number", "level.value", "kWh", 0);

    // Backup & Restore (data points remain, backup frequency is controlled via schedule)
    createDP(base+"backup", "string", "json", "");
    createDP(base+"backup_now", "boolean", "button", "", false);
    createDP(base+"restore_now", "boolean", "button", "", false);
    createDP(base+"last_backup_time", "string", "value", "", "");
}
setupStructure();

// === Backup function ===
function createBackup() {
    const now = new Date();
    const data = {
        timestamp: now.toISOString(),
        current: getState(base+"current_consumption").val || 0,
        wattSeconds: wattSecondsToday,
        total: getState(base+"total_consumption").val || 0,
        lastCalculationTime: lastCalculationTime
    };
    setState(base+"backup", JSON.stringify(data), true);
    setState(base+"last_backup_time", now.toISOString(), true);
    log("Backup created: " + JSON.stringify(data));
}

// === Restore function ===
function restoreBackup() {
    const backupData = getState(base+"backup").val;
    if (!backupData) { log("No backup available."); return; }

    let data;
    try { data = JSON.parse(backupData); } 
    catch (e) { log("Could not read backup: " + e); return; }

    setState(base+"current_consumption", data.current || 0, true);
    wattSecondsToday = data.wattSeconds || 0;
    lastCalculationTime = data.lastCalculationTime || new Date().getTime();
    setState(base+"total_consumption", data.total || 0, true);
    log("Backup successfully restored!");
}

// === Interval-based consumption calculation (every 1 second) ===
// Data is held in variables, write operations are timed
setInterval(() => {
    let amp = getState(ampDP).val;
    let volt = getState(voltDP).val;

    // Error handling: missing values
    if (typeof amp !== 'number' || isNaN(amp)) amp = 0;
    if (typeof volt !== 'number' || isNaN(volt)) volt = 0;

    const currentWatt = amp * volt;
    const now = new Date().getTime();
    const timeDeltaSeconds = (now - lastCalculationTime) / 1000;
    lastCalculationTime = now;

    // Accumulate only if Watt >= 0
    if (currentWatt >= 0) {
        wattSecondsToday += currentWatt * timeDeltaSeconds;
    }

    // EMA for Watt display
    // IMPORTANT: Use setState with 'false' so it is not written to the SD card
    lastWatt = alpha * currentWatt + (1 - alpha) * lastWatt;
    setState(base+"current_watt", Math.round(lastWatt), false); 

}, 1000);

// === Saving daily consumption every minute for testing ===
// Writes the current daily consumption to the SD card every minute
schedule("* * * * *", function () {
    const kWhToday = parseFloat((wattSecondsToday / 3600 / 1000).toFixed(3));
    setState(base+"current_consumption", kWhToday, true);

    // Retrieve values directly to get the current state
    let amp = getState(ampDP).val;
    let volt = getState(voltDP).val;
    let currentWatt = amp * volt;

    // Filtered daily consumption: values < MIN_WATT_THRESHOLD are set to the previous value
    let kWhFiltered = kWhToday;
    if (currentWatt < MIN_WATT_THRESHOLD) {
        kWhFiltered = getState(base+"current_consumption_filtered").val || 0;
    }
    setState(base+"current_consumption_filtered", kWhFiltered, true);

    log("Saving daily consumption: " + kWhToday + " kWh");
});


// === Update lifetime counter once daily (23:59) ===
schedule("59 23 * * *", function () {
    const total = getState(base+"total_consumption").val || 0;
    const daily_consumption = getState(base+"current_consumption").val || 0;

    setState(base+"total_consumption", parseFloat((total + daily_consumption).toFixed(3)), true);
    setState(base+"current_consumption", 0, true);
    setState(base+"current_consumption_filtered", 0, true);
    wattSecondsToday = 0;

    // Perform the daily backup after the daily counter has been reset
    createBackup();

    log("Lifetime counter updated and daily backup created.");
});

// === Backup/Restore Buttons ===
on({id: base+"backup_now", change: "any"}, (obj) => {
    if (obj.state.val === true) {
        createBackup();
        setState(base+"backup_now", false, true);
        log("Manual backup created.");
    }
});

on({id: base+"restore_now", change: "any"}, (obj) => {
    if (obj.state.val === true) {
        restoreBackup();
        setState(base+"restore_now", false, true);
        log("Backup restored.");
    }
});

// --- Manual adjustment of daily consumption ---
on({id: base+"adjust_current_consumption", change: "any"}, function (obj) {
    const newKWh = obj.state.val;
    if (typeof newKWh === 'number' && newKWh >= 0) {
        wattSecondsToday = newKWh * 1000 * 3600;
        setState(base+"current_consumption", newKWh, true);
        setState(base+"current_consumption_filtered", newKWh, true);
        log("Daily consumption manually set to " + newKWh + " kWh. Internal counter adjusted.");
    } else {
        log("Invalid value for manual adjustment.", "warn");
    }
});
