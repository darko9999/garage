import express from "express";
import path from "path";
import rpio from "rpio";
import { DateTime } from "luxon";

enum DoorStates {
  Closed = "Closed",
  Closing = "Closing",
  Opened = "Opened",
  Opening = "Opening",
  Unknown = "Unknown",
}

const app = express();
const port = 80;

const state = {
  doorState: DoorStates.Unknown,
  goalState: DoorStates.Unknown,
  goalTimestamp: DateTime.now(),
  updateTimestamp: DateTime.now(),
  button: false,
};

const MOCK = "raspi-zero-w";
const OPEN_PIN = 40; //Opened sensor
const CLOSE_PIN = 36; //Closed sensor
const BUTTON_PIN = 11; //Button relay
const BUTTON_PRESS_MS = 2 * 1000; // Button press duration
const ACTION_DELAY_MS = 5 * 1000; // Min delay between actions
const BUTTON_PASSIVE = rpio.HIGH;
const BUTTON_ACTIVE = rpio.LOW;

rpio.init({
  gpiomem: true,
  mapping: "physical",
  //   mock: MOCK,
  close_on_exit: true,
});

rpio.open(OPEN_PIN, rpio.INPUT, rpio.PULL_UP);
rpio.open(CLOSE_PIN, rpio.INPUT, rpio.PULL_UP);
rpio.open(BUTTON_PIN, rpio.OUTPUT);
rpio.write(BUTTON_PIN, BUTTON_PASSIVE);

function updateState() {
  const now = DateTime.now();
  if (now.diff(state.updateTimestamp).toMillis() < 100) {
    console.log("Need to wait mone");
    return;
  }
  state.updateTimestamp = now;

  const is_opened = rpio.read(OPEN_PIN) == rpio.LOW;
  if (is_opened) {
    state.doorState = DoorStates.Opened;
    if (state.goalState == DoorStates.Opened) {
      console.log("Done opening");
      state.goalState = DoorStates.Unknown;
      state.goalTimestamp = now;
    }
    return;
  }
  const is_closed = rpio.read(CLOSE_PIN) == rpio.LOW;
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
  rpio.write(BUTTON_PIN, BUTTON_ACTIVE);
  state.button = true;
  console.log("Pushing button");

  setTimeout(() => {
    rpio.write(BUTTON_PIN, BUTTON_PASSIVE);
    state.button = false;
    console.log("Releasing button");
  }, BUTTON_PRESS_MS);
}

app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req: any, res) => {
  res.render("index", { state });
});

app.get("/open", (req: any, res) => {
  changeToGoal(DoorStates.Opened);
  res.redirect("/");
});

app.get("/close", (req: any, res) => {
  changeToGoal(DoorStates.Closed);
  res.redirect("/");
});

function changeToGoal(goal: DoorStates) {
  const now = DateTime.now();
  if (now.diff(state.goalTimestamp).toMillis() > ACTION_DELAY_MS) {
    if (state.doorState != goal) {
      state.goalState = goal;
      state.goalTimestamp = now;
      pushButton();
    }
  } else {
    console.log("Need more time before next action");
  }
}

app.get("/set-open", (req: any, res) => {
  forceDoorState(DoorStates.Opened);
  res.redirect("/");
});

app.get("/set-close", (req: any, res) => {
  forceDoorState(DoorStates.Closed);
  res.redirect("/");
});

function forceDoorState(doorState: DoorStates) {
  state.doorState = doorState;
  state.goalState = DoorStates.Unknown;
  state.goalTimestamp = DateTime.now();
}

app.get("/status", (req: any, res) => {
  res.render("status", { status: JSON.stringify(state, null, "  ") });
});

// assume 404 since no middleware responded
app.use(function (req, res, next) {
  res.status(404).render("404", { url: req.originalUrl });
});

app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
