"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const rpio_1 = __importDefault(require("rpio"));
const luxon_1 = require("luxon");
var DoorStates;
(function (DoorStates) {
    DoorStates["Closed"] = "Closed";
    DoorStates["Closing"] = "Closing";
    DoorStates["Opened"] = "Opened";
    DoorStates["Opening"] = "Opening";
    DoorStates["Unknown"] = "Unknown";
})(DoorStates || (DoorStates = {}));
const app = express_1.default();
const port = 80;
const state = {
    doorState: DoorStates.Unknown,
    goalState: DoorStates.Unknown,
    goalTimestamp: luxon_1.DateTime.now(),
    updateTimestamp: luxon_1.DateTime.now(),
    button: false,
};
const MOCK = "raspi-zero-w";
const OPEN_PIN = 40; //Opened sensor
const CLOSE_PIN = 36; //Closed sensor
const BUTTON_PIN = 11; //Button relay
const BUTTON_PRESS_MS = 2 * 1000; // Button press duration
const ACTION_DELAY_MS = 5 * 1000; // Min delay between actions
const BUTTON_PASSIVE = rpio_1.default.HIGH;
const BUTTON_ACTIVE = rpio_1.default.LOW;
rpio_1.default.init({
    gpiomem: true,
    mapping: "physical",
    //   mock: MOCK,
    close_on_exit: true,
});
rpio_1.default.open(OPEN_PIN, rpio_1.default.INPUT, rpio_1.default.PULL_UP);
rpio_1.default.open(CLOSE_PIN, rpio_1.default.INPUT, rpio_1.default.PULL_UP);
rpio_1.default.open(BUTTON_PIN, rpio_1.default.OUTPUT);
rpio_1.default.write(BUTTON_PIN, BUTTON_PASSIVE);
function updateState() {
    const now = luxon_1.DateTime.now();
    if (now.diff(state.updateTimestamp).toMillis() < 100) {
        console.log("Need to wait mone");
        return;
    }
    state.updateTimestamp = now;
    const is_opened = rpio_1.default.read(OPEN_PIN) == rpio_1.default.LOW;
    if (is_opened) {
        state.doorState = DoorStates.Opened;
        if (state.goalState == DoorStates.Opened) {
            console.log("Done opening");
            state.goalState = DoorStates.Unknown;
            state.goalTimestamp = now;
        }
        return;
    }
    const is_closed = rpio_1.default.read(CLOSE_PIN) == rpio_1.default.LOW;
    if (is_closed) {
        state.doorState = DoorStates.Closed;
        if (state.goalState == DoorStates.Closed) {
            console.log("Done closing");
            state.goalState = DoorStates.Unknown;
            state.goalTimestamp = now;
        }
        return;
    }
    if (state.goalState == DoorStates.Closed) {
        state.doorState = DoorStates.Closing;
    }
    if (state.goalState == DoorStates.Opened) {
        state.doorState = DoorStates.Opening;
    }
}
setInterval(() => {
    updateState();
}, 500);
function pushButton() {
    rpio_1.default.write(BUTTON_PIN, BUTTON_ACTIVE);
    state.button = true;
    console.log("Pushing button");
    setTimeout(() => {
        rpio_1.default.write(BUTTON_PIN, BUTTON_PASSIVE);
        state.button = false;
        console.log("Releasing button");
    }, BUTTON_PRESS_MS);
}
app.use(express_1.default.static(path_1.default.join(__dirname, "public")));
app.set("view engine", "hbs");
app.set("views", path_1.default.join(__dirname, "views"));
app.get("/", (req, res) => {
    res.render("index", { state });
});
app.get("/open", (req, res) => {
    changeToGoal(DoorStates.Opened);
    res.redirect("/");
});
app.get("/close", (req, res) => {
    changeToGoal(DoorStates.Closed);
    res.redirect("/");
});
function changeToGoal(goal) {
    const now = luxon_1.DateTime.now();
    if (now.diff(state.goalTimestamp).toMillis() > ACTION_DELAY_MS) {
        if (state.doorState != goal) {
            state.goalState = goal;
            state.goalTimestamp = now;
            pushButton();
        }
    }
    else {
        console.log("Need more time before next action");
    }
}
app.get("/set-open", (req, res) => {
    forceDoorState(DoorStates.Opened);
    res.redirect("/");
});
app.get("/set-close", (req, res) => {
    forceDoorState(DoorStates.Closed);
    res.redirect("/");
});
function forceDoorState(doorState) {
    state.doorState = doorState;
    state.goalState = DoorStates.Unknown;
    state.goalTimestamp = luxon_1.DateTime.now();
}
app.get("/status", (req, res) => {
    res.render("status", { status: JSON.stringify(state, null, "  ") });
});
app.get("/status.json", (req, res) => {
    res.contentType("application/json");
    res.send(JSON.stringify(state));
});
// assume 404 since no middleware responded
app.use(function (req, res, next) {
    res.status(404).render("404", { url: req.originalUrl });
});
app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});
