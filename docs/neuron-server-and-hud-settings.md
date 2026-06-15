# Neuron Server and HUD Settings

## Why the Server Exists

If the HUD is detached or the Neuron attachment is detached, scripts inside them cannot keep running.

The backup rule is:

- Neuron worn: stats run and sync to Neuron Server.
- Neuron detached: server keeps the last state and marks it paused.
- Neuron reattached: Neuron requests restore from server.

Stats do not decay while Neuron is detached.

## Scripts

- `Neuron.lsl`
- `Neuron Server.lsl`
- `Neuro_HUD_Controller_v0_1.lsl`

## Placement

`Neuron Server.lsl` goes into the Camden Falls/Neuro server object.

`Neuro_HUD_Controller_v0_1.lsl` goes into the Neuro Pad HUD root.

`Neuron.lsl` goes into the worn avatar attachment.

## HUD Settings

The HUD Settings button now has a Neuron category.

Settings > Neuron:

- Setup
- Profile
- Stats
- Sync HUD
- Neuron

These replace the need for users to type:

```text
/77 setup
/77 profile
/77 stats
/77 neuron
/77 sync hud
```
