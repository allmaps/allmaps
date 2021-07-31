require('dotenv').config()

const { promisify } = require('util')
const redis = require('redis')
const client = redis.createClient(process.env.REDIS_URL, {
  return_buffers: true
})

const EXPIRE_SECONDS = 60 * 10

const getAsync = promisify(client.get).bind(client)
const setAsync = promisify(client.set).bind(client)
const expireAsync = promisify(client.expire).bind(client)

async function set (key, data) {
  await setAsync(key, data)
  await expireAsync(key, EXPIRE_SECONDS)
}

async function get (key) {
  const data = await getAsync(key)
  return data
}

module.exports = {
  get,
  set
}
