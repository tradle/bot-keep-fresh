
# @tradle/bot-keep-fresh

make sure your users are up to date with your latest models, styles, and whatever else they need the latest and bestest of

## Usage 

Let's say we want to send a ModelPack message to our users whenever our models change and a StylesPack when our styles change. This is how you might do it:

```js
const keepFresh = require('@tradle/bot-keep-fresh')
// if we change ./mymodels
// we want to make sure the user gets sent a ModelsPack in the next interaction
const myModels = require('./mymodels')
const myStyles = require('./mystyles')

const modelsFreshener = bot.use(keepModelsFresh(myModels))
const stylesFreshener = bot.use(keepStylesFresh(myStyles))

// to perform hot updates:
// modelsFreshener.update(newModels)

function keepModelsFresh (models) {
  return keepFresh({
    id: 'models',
    item: models,
    // in proactive mode, the bot will update all known users on start
    // proactive: true,
    update: function update ({ bot, user, item }) {
      // send the latest models to the user
      return bot.send({
        userId: user.id,
        object: {
          _t: 'tradle.ModelsPack',
          models: item
        }
      })
    }
  })
}

function keepStylesFresh (styles) {
  return keepFresh({
    id: 'styles',
    item: styles,
    // in proactive mode, the bot will update all known users on start
    // proactive: true,
    update: function update ({ bot, user, item }) {
      // send the latest models to the user
      return bot.send({
        userId: user.id,
        object: {
          _t: 'tradle.StylesPack',
          styles: item
        }
      })
    }
  })
}
```
