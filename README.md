
# @tradle/bot-keep-fresh

make sure your users are up to date with your latest models

## Usage 

Let's say we want to send a ModelPack message to our users whenever our models change. This is how you might do it:

```js
const keepFresh = require('@tradle/bot-keep-fresh')
// if we change ./mymodels
// we want to make sure the user gets sent a ModelsPack in the next interaction
const myModels = require('./mymodels')

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
    })
  })
}

bot.use(keepModelsFresh(myModels))
```
