# Garage Door Controller

A garage door controller written in Typescript usable via API or a browser.

ExpressJS is used to show simple web pages for manual control.

Raspberry Pi GPIO pins are used to sense the door presence and activate a relay to toogle the door.
* limit switch/sensor at the door's max opened position
* limit switch/sensor at the door's closed position
* a relay used to activate the door

Tools needed on the Rasberry Pi:
* npm to install yarn
* yarn (npm is very slow to do updates on flash storage)
* node (v10 assumed)

The compiled JS version is included.

## TODOs
* add some icons
* add favicons
* animate transition state?
