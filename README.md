# Extension Migrations

> Simple migration tool for browser extensions

## Overview

Extension Migrations is a simple library designed to run migrations in browser extensions when the version is changed.

Use cases might be:

- modifying storage key format
- preparing new data
- deleting old data

## Installation

The library supports two installation methods.

### Copy and paste

The file in `migrations.js` is standalone JavaScript with JSDoc types.

If your project is small, and missing a compile step, just copy the file or the code and import.

### NPM

Install from NPM like any other package:

```
npm i @davestewart/extension-migrations
```

## Usage

### Setup

Migrations should be modelled as a hash of `version: migration` pairs, each with `up` and `down` methods:

```js
const migrations = {
  '0.1': {
    up () {
      // one time setup
    }
  },

  '0.5': {
    up () {
      // do some action
    },
    down () {
      // undo some action
    },
  }
}
```

The `up` methods are called when a higher version is installed, and `down` migrations when a lower version is installed. 

Note that migration keys must **exactly** match the version strings in your extension's manifest, i.e. `2.0` is different from `2.0.0`.

### Running migrations

To run a migration, import and call the `migrate()` function:

```js
import { migrate } from '@davestewart/extension-migrations'

const result = await migrate({ ... }, fromVersion, toVersion)
```

You should run the migration in the `onInstalled` listener: 

```js
chrome.runtime.onInstalled.addListener(async (event) => {
  // variables
  const { version } = chrome.runtime.getManifest()
  const { previousVersion } = event
  
  // run migrations
  const { type, versions } = await migrate(migrations, previousVersion, version)
  
  // log
  console.log('migration complete:', type, versions)
})
```

Note that:

- migrations will run only when the extension's version changes
- on extension reload, no migrations will run, as the version has not changed
- to downgrade an extension in development, change the manifest version, then reload the extension

The function returns the following data:

```js
{
  versions: ['1.0', '1.1', ...],
  type: 'all',
}
```

The `versions` property will be an array of the versions that were run.

The `type` property will be one of:

- `skip`: there were no migrations to run
- `all`:  the extension was installed
- `none`: the extension was reloaded
- `up`: the extension was upgraded 
- `down`: the extension was downgraded (likely only in development)

## Error handling

To handle errors, wrap the migration in a `try/catch`:

```js
// migrations
const migrations = {
  '2.0': {
    up (version) {
      errVersion = version
      throw new Error('Could not create database')
    },
    down () {}
  },
}

// track errors
let errVersion

// run migrations
try {
  await migrate(migrations, previousVersion, version)
}
catch (err) {
  console.log(`${err.message} for version ${errVersion}`)
}
```
