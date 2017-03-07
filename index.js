const crypto = require('crypto')
const typeforce = require('typeforce')
const Promise = require('bluebird')
const co = Promise.coroutine
const debug = require('debug')('tradle:bot-keep-fresh')
const stringify = require('json-stable-stringify')
const STORAGE_KEY = require('./package').name
const isPromise = obj => obj && typeof obj.then === 'function'

/**
 * Make sure your users are up to date with your keepFresh assets (models, styles, whatever)
 * @param  {String}       options.id            unique id for your assets, e.g. 'colors' or 'handsomest Swedes'
 * @param  {Object|Array} options.item          the asset you want to keep fresh
 * @param  {Function}     options.update        the function to call when the fresh asset needs to be delivered
 * @param  {Boolean}      [options.proactive]   whether to update users immediately on installation
 * @return {Function}     uninstall strategy function
 * @example
 *
 * const keepModelsFresh = keepFresh({
 *   id: 'models',
 *   item: require('./mymodels')
 *   update: function update ({ bot, user, item }) {
 *     // send the keepFresh models to the user
 *     return bot.send({
 *       userId: user.id,
 *       object: {
 *         _t: 'tradle.ModelsPack',
 *         models: item
 *       }
 *     })
 *   })
 * })
 */
module.exports = function keepFresh (opts) {
  typeforce({
    id: 'String',
    item: typeforce.oneOf('Object', 'Array'),
    update: 'Function',
    proactive: '?Boolean'
  }, opts)

  let bot
  let hash
  let { id, item, update, proactive } = opts

  /**
   * Allow hot updates
   */
  const updateItem = co(function* updateItem (latest) {
    item = latest
    hash = hashItem(latest)
    if (proactive) return ensureFresh()
  })

  const updateIfFresh = co(function* updateIfFresh ({ user }) {
    if (!user[STORAGE_KEY]) {
      user[STORAGE_KEY] = {}
    }

    const bin = user[STORAGE_KEY]
    const storedHash = bin[id]
    if (storedHash !== hash) {
      debug(`updating user "${user.id}" with fresh "${id}"`)
      yield update({ bot, user, item })
      bin[id] = hash
      const maybePromise = bot.users.save(user)
      if (isPromise(maybePromise)) yield maybePromise
    }
  })

  function getAllUsersArray () {
    return Object.keys(bot.users.list())
      .map(id => bot.users.get(id))
  }

  const ensureFresh = co(function* ensureFresh (users) {
    // normalize to array
    if (users) {
      users = [].concat(users)
    } else {
      users = getAllUsersArray()
    }

    return Promise.all(users.map(user => updateIfFresh({ user })))
  })

  return function install (botHandle) {
    bot = botHandle
    updateItem(item)
    const ret = bot.addReceiveHandler(updateIfFresh)

    // export functions
    ret.update = updateItem
    ret.ensureFresh = ensureFresh
    return ret
  }
}

function hashItem (item) {
  return sha256(stringify(item))
}

function sha256 (str) {
  return crypto
    .createHash('sha256')
    .update(str)
    .digest('hex')
}
