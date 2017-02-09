const keepFresh = require('@tradle/bot-keep-fresh')

/**
 * If models change, we want to apprise our users with a ModelsPack
 * @param  {Array}      models
 * @return {Function}   strategy installation function
 */
module.exports = function keepModelsFresh (models) {
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
          // latest models
          models: item
        }
      })
    }
  })
}
