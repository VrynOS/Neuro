# Camden Falls Official Clock

This is the saved CDF time format for Neuro and Camden Falls.

## Time Rules

- 1 Camden Falls day = 6 real-life hours.
- 1 Camden Falls hour = 15 real-life minutes.
- CDF day offset = -8 CDF hours.
- Default display format = 12-hour time with seconds.
- Optional display format = 24-hour time with seconds.

## Examples

- 12-hour: `7:42:09 PM`
- 24-hour: `19:42:09`

## Files

- `Camden_Falls_Official_Clock.lsl` is the LSL source-of-truth clock.
- `clock.html`, `clock.css`, and `clock.js` are the media clock face.
- `Camden_Falls_Clock_Media_Bridge.lsl` loads the media clock onto an SL media face.

## Commands

- `/77 cdf time`
- `/77 cdf clock`
- `/77 cdf clock status`
- `/77 cdf 12`
- `/77 cdf 24`
