# negan-bot

![version on npm](https://img.shields.io/npm/v/negan-bot?style=flat-square) ![npm total downloads](https://img.shields.io/npm/dt/negan-bot?style=flat-square)
![GitHub contributors](https://img.shields.io/github/contributors/BenjaminKauer/negan-bot?style=flat-square) ![GitHub last commit](https://img.shields.io/github/last-commit/BenjaminKauer/negan-bot?style=flat-square)

This project is meant to deliver some basic, extensible discord bot (as the name may have suggested).

# Getting started / Prerequisites

First of all, you need to register your bot (application) on Discord. You can do that on the [Discord Developer Portal](https://discord.com/developers/applications). I won't provide a tutorial for that process at this point.

I'm developing `negan-bot` using node version `16.13.0` and TypeScript version `4.4.4`.
This project uses [discord.js](https://discord.js.org/#/) in version `^13.2.0`.

# Install and run

In order to create a new, custom bot you can follow these steps:

  1. In the desired directory, run `npm init` to create a new npm module
  2. Run `npm i negan-bot --save` to install all the dependencies
  3. In your main `.ts`-file, paste the following:

```typescript
import { NeganBot } from 'negan-bot';

const bot: NeganBot = new NeganBot();
```
  4. Set up your environment (see [Environment Config](#environment-config))
  5. Create a `tsconfig.json` in order to configure the TypeScript compiler, paste the following (example):
  ```json
    {
        "compilerOptions": {
            "target": "es5",
            "module": "CommonJS",
            "declaration": true,
            "outDir": "./dist",
            "strict": true,
            "lib": [
                "dom",
                "es2015"
            ],
            "moduleResolution": "node",
            "sourceMap": true,
            "strictNullChecks": true,
            "suppressImplicitAnyIndexErrors": true,
            "experimentalDecorators": true,
            "emitDecoratorMetadata": true,
            "noImplicitAny": false,
            "noUnusedLocals": true,
            "rootDir": "./src",
            "noUnusedParameters": true,
            "esModuleInterop": true,
            "allowSyntheticDefaultImports": true,
            "resolveJsonModule": true
        },
        "include": [
            "src/**/*.ts"
        ],
        "exclude": [
            "node_modules"
        ]
    }
  ```
  6. Run `tsc` to build your bot.
  7. Run `node dist/<your-main-file>.ts`
  8. Your custom bot should be up and running


# Environment config

The bot reads certain environment variables, for example the Discord OAuth token required to connect to the Discord API. You can either set those variables in your system, or just place a file named `.env` in the root directory of this project.

Example `.env`:

```ini
# The oauth token for your bot, provided by Discord
TOKEN=ABCDEFGHIJKLMNOPQRSTUVWXYZ1234

# development | production
ENVIRONMENT=development

# The command prefix
PREFIX=_

# name for the sqlite3 db file
# Only required if using the SQLite-Adapter
SQLITE_FILENAME=my-negan-bot.sqlite3

# url that will be shown in the bot's status (STREAMING <URL>)
URL=https://example.com

# id of the bot owner's discord user
BOT_OWNER_ID=1234567890123456789

# id of the debug channel. the bot needs to be able to post messages into that channel
# (if a debug channel has been set)
DEBUG_CHANNEL_ID=123456789012345678
```

---


# Import and use a module

To make use of a module, you need to pass it to `registerModules()`.

See example for [hall of fame module](https://www.npmjs.com/package/negan-module-hall-of-fame):

```typescript
import { NeganBot } from 'negan-bot';
import { HallOfFameModule } from 'negan-module-hall-of-fame';

const bot: NeganBot = new NeganBot();

bot.registerModules([
    HallOfFameModule
]);

const hofModule: HallOfFameModule | undefined = bot.getModule(HallOfFameModule);
if (hofModule) {
    hofModule.setThreshold(2);
}
```

---

# Writing own modules

### Example

For an example on how to create a module for negan-bot, have a look at [hall of fame module](https://github.com/S-K-Lieren/negan-modules/tree/master/hall-of-fame).

### Extend AbstractModule and decorate with @Module()

Your module will have to extend `AbstractModule`. Furthermore, you need to pass some information to the `ModuleHub`, using the `@Module()` decorator.

##### Example:

```typescript
@Module({
    name: 'exampleModule',  // the module's name
    alwaysActivated: true   // whether it's always enabled or can be disabled
})
export class MyNewModule extends AbstractModule {
    ...
}
```

### Use the built-in sqlite3-adapter

I've built a _very_ basic sqlite3-adapter. You can use it (or write your own database-adapter, and use that one) by calling `this.database.create()`, `this.database.read()`, `this.database.update()` or `this.database.delete()`.

##### Example:
```typescript
this.database.read<string>(guildID, 'news-channel')
    .then((channelID: string | undefined) => {
        if (channelID) {
            this.newsChannelID.set(guildID, channelID);
        }
    });

```

__The built-in sqlite3-adapter is not meant to be used in production environments.__

### Initialization

Once the underlying discord client is `ready`, the `ModuleHub` will call each module's `init()`. So that's the right place to do some initialization, for example loading data from the database.



### Registering commands

In your module, implement the method `registerCommands(): Commands`. This method will automatically be called by the `ModuleHub`. I'm planning to create slash commands out of the registered commands in the future.

##### Example:
```typescript
protected registerCommands(): Commands {
    return {
        'time': {
            onlyMods: true,
            handler: (msg: Message) => this.postTime(msg)
        }
    };
}

private postTime(msg: Message): void {
    msg.reply({ content: `It's <t:${Math.floor(Date.now() / 1000)}:T> o'clock.` });
}

```

Results in:

![negan-screen](https://user-images.githubusercontent.com/5950968/142497618-1451d9a0-c306-4cba-942b-389ffe155c19.PNG)


