# Neuron Split Install

Use this split version when the combined `Neuron.lsl` is too heavy.

## Avatar Attachment

Remove:

- `Neuron`

Add both scripts to the same Neuron avatar attachment:

- `Neuron Part 1`
- `Neuron Part 2`

Part 1 handles profile setup, HUD sync, and Neuron Server backup.
Part 2 handles stats, XP, levels, verification, and Breadcrumb tracking.

Both scripts must be in the same attachment/linkset because they talk by link messages.

## Server Object

Keep this script in the Neuro/Camden Falls server object:

- `Neuron Server`

The server stores the last known Neuron snapshot by avatar UUID. If the HUD is off or Neuron is detached, the server keeps the backup and stats pause until Neuron returns.

## HUD

Keep this script in the Neuro HUD root:

- `Neuro_HUD_Controller_v0_1`

HUD settings can send these commands to Neuron:

- `/77 setup`
- `/77 profile`
- `/77 stats`
- `/77 neuron`
- `/77 sync hud`

## Important

`state` is a reserved LSL word. Do not use it as a variable or parameter name in Neuron scripts.
