const crypto = require('crypto')
const typeforce = require('typeforce')
const co = require('co').wrap
const stringify = require('json-stable-stringify')
const thisPackageName = require('./package').name
const debug = require('debug')(thisPackageName)
const STORAGE_KEY = thisPackageName
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

  return bot => install(bot, opts)
}

function install (bot, opts) {
  let hash
  let { id, item, update, proactive } = opts
  let initialized
  const promiseInit = new Promise(resolve => {
    initialized = resolve
  })

  /**
   * Allow hot updates
   */
  const updateItem = co(function* (latest, force) {
    if (!force) yield promiseInit
    item = latest
    hash = hashItem(latest)
    if (proactive) yield ensureFresh()
  })

  /**
   * Propagate the fresh item to the user
   * @param {Object} options.user
   * @yield {[type]} [description]
   */
  const updateIfFresh = co(function* ({ user }) {
    if (!user[STORAGE_KEY]) {
      user[STORAGE_KEY] = {}
    }

    const bin = user[STORAGE_KEY]
    const storedHash = bin[id]
    if (storedHash !== hash) {
      debug(`updating user "${user.id}" with fresh "${id}"`)
      yield update({ bot, user, item })
      bin[id] = hash
      yield bot.users.merge({
        id: user.id,
        [STORAGE_KEY]: bin
      })
    }
  })

  const ensureFresh = co(function* (users) {
    debug('updating users')
    // normalize to array
    if (users) {
      users = [].concat(users)
    } else {
      users = yield bot.users.list()
    }

    return yield map(users, user => updateIfFresh({ user }))
  })

  const uninstall = function uninstall () {
    removeReceiveHandler()
  }

  updateItem(item, true).then(initialized)

  const removeReceiveHandler = bot.onmessage(updateIfFresh)
  return {
    ready: promiseInit,
    uninstall,
    update: updateItem,
    ensureFresh
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

function map (objOrArr, mapper) {
  if (Array.isArray(objOrArr)) {
    return objOrArr.map(mapper)
  }

  return Object.keys(objOrArr)
    .map((key, i) => mapper(objOrArr[key], i))
}
