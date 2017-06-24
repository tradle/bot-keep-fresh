const co = require('co').wrap
const test = require('tape')
const keepFresh = require('./')

test('basic', co(function* (t) {
  const id = 'stuff'
  const item = [{ id: 'a' }, { id: 'b' }]
  const update = co(function* () {
    timesUpdated++
  })

  let timesUpdated = 0
  let timesSaved = 0

  const user = { id: 'ted' }
  const users = {
    get: id => id === user.id ? user : null,
    list: () => {
      return Promise.resolve({ [user.id]: user })
    },
    merge: data => {
      timesSaved++
      for (let prop in data) {
        user[prop] = data[prop]
      }

      return Promise.resolve()
    }
  }

  const handlers = []
  const bot = {
    receive: co(function* () {
      // doesn't matter what we're receiving
      for (let handler of handlers) {
        yield handler({ user })
      }
    }),
    users,
    onmessage: function (handler) {
      handlers.push(handler)
      return () => handlers.filter(h => h !== handler)
    }
  }

  let api = keepFresh({ id, item, update })(bot)

  yield bot.receive()
  t.equal(timesUpdated, 1)
  t.equal(timesSaved, 1)

  yield bot.receive()
  t.equal(timesUpdated, 1)
  t.equal(timesSaved, 1)

  // restart
  api.uninstall()
  item.push({ id: 'c' })
  api = keepFresh({ id, item, update })(bot)
  yield bot.receive()
  t.equal(timesUpdated, 2)
  t.equal(timesSaved, 2)

  // proactive
  api.uninstall()
  item.push({ id: 'd' })
  api = keepFresh({
    id,
    item,
    update,
    proactive: true
  })(bot)

  yield api.ready

  t.equal(timesUpdated, 3)
  t.equal(timesSaved, 3)

  // proactive
  api.uninstall()
  api = keepFresh({
    id,
    item,
    update,
    proactive: true
  })(bot)

  yield api.update('as string?')
  t.equal(timesUpdated, 4)
  t.equal(timesSaved, 4)

  t.end()
}))
