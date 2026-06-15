# Neuro-Link Neuron v0.2

`Neuron.lsl` is the wearer-side brain for Neuro-Link.

It is designed to be worn by the avatar at all times.

## Stores

- Display name
- Sex
- Age
- Title
- Camden Falls location: Chi-Core or Eden Palms
- Hunger
- Thirst
- Sleep
- Hygiene
- Energy
- Fun
- XP
- Level
- Verified flag

Profile and stat data are stored inside the worn Neuron attachment using Linkset Data.

## First-Time Setup

On first wear, Neuron asks:

- Sex
- Age
- Location: Chi-Core or Eden Palms
- Title

The user can restart setup with:

```text
/77 reset setup
```

## XP Rules

- Breadcrumb use: 100 XP
- Worn for 1 Camden Falls hour: 20 XP
- Wallet use: 100 XP
- Work clock-in: 150 XP
- Work clock-out or auto clock-out: 150 XP
- Rental rented: 150 XP
- Rent paid on time: 200 XP
- Rent late: 50 XP
- Purchase/transaction: 100 XP

Every 1000 XP gives 1 level.

Levels are unlimited.

Level 10+ sets `verified=true`.

## Time Rule

Default:

```text
1 Camden Falls hour = 900 RL seconds = 15 RL minutes
```

Change `CDF_HOUR_SECONDS` at the top of `Neuron.lsl` if Camden Falls time changes.

## HUD Channel

Neuron broadcasts snapshots on:

```text
-73463304
```

Snapshot source:

```text
neuron.brain
```

The HUD controller can listen to this channel and update the panels/stat bars.
