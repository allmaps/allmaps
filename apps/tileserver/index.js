const axios = require('axios')
const sharp = require('sharp')
const express = require('express')
const app = express()

const cache = require('./src/cache.js')

const port = process.env.PORT || 3000

const tileUrl = 'https://tile.loc.gov/image-services/iiif/service:gmd:gmd380:g3804:g3804n:rr003520/0,0,2048,2048/256,/0/default.jpg'

async function createImage () {
  let data = await cache.get(tileUrl)

  if (!data) {
    data = (await axios({ url: tileUrl, responseType: 'arraybuffer' })).data
    await cache.set(tileUrl, data)
  }

  const image = await sharp(data)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  return image
}

app.get('/', async (req, res) => {
  res.send({
    name: 'tileserver'
  })
})

// TODO: also support PNG
app.get('/:mapId/:z/:x/:y.jpg', async (req, res) => {
  const image = await createImage()

  for (let i = 0; i < image.data.length; i++) {
    if (i % Math.round(Math.random() * 16) === 0) {
      image.data[i] = Math.round(Math.random() * 255)
    }
  }

  const data = await sharp(image.data, {
    raw: {
      width: image.info.width,
      height: image.info.height,
      channels: image.info.channels
    }
  })
    .toFormat('jpg')
    .toBuffer()

  res.set({ 'Content-Type': 'image/jpeg' })
  res.send(data)
})

app.listen(port, () => {
  console.log(`Allmaps Tileserver listening at http://localhost:${port}`)
})
