# DigiDarts

DigiDarts is a project heavily inspired by several other projects to read the signals from an electronic dartboard and use them in a rich media experience served up in a web browser. Either displayed on a screen near the board or, ideally, projected onto/around the board itself.

## Usage
This doesn't get into the disassembly, contact tracing, wiring or soldering part of the hardware interface, but see credits below for links to other pages with insight on that. However, I do include the Arduino sketch that does all the communicating.

### Dependencies

* Esp32-based microcontroller with Wifi
* Node.JS server configured to run on a host machine.
* Some sort of consumer electronic dartboard. Go cheap, cuz you're gonna tear up the internals a bit.

## Version History

* 0.1
    * Initial Release

## Roadmap
* Player name entry from mobile or desktop device
* Robust game and score history
* Random and varied multimedia for events
* Additional game types (Cricket, et al)
* Music

## Acknowledgments

Inspiration, code snippets, etc.
* [ChatGPT](https://chatgpt.com) for code help and formatting
* [u/philharlow's reddit post](https://www.reddit.com/r/arduino/comments/tw8vui/finally_got_my_dartboard_project_glued_together/) for seeding the idea
* [NorthOsoft](http://northosoft.com/) for a detailed PDF on their hardware build
* [RMAlves' Instructable](https://www.instructables.com/OpenDarts-the-Home-Made-Darts-Machine/) for additional hardware details
* [Elevenlabs.io](https://elevenlabs.io/app/speech-synthesis) for Speech Synthesis
