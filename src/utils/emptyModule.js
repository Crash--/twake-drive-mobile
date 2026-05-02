module.exports = new Proxy(
  {},
  {
    get: () => () => Promise.resolve(null)
  }
)
