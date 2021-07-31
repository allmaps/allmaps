const axios = require('axios')
const sharp = require('sharp')
const express = require('express')
const app = express()

const port = process.env.PORT || 3000

const tileUrl = 'https://tile.loc.gov/image-services/iiif/service:gmd:gmd380:g3804:g3804n:rr003520/2048,4096,2048,1584/512,/0/default.jpg'

async function createImage () {
  const input = (await axios({ url: tileUrl, responseType: 'arraybuffer' })).data

  const image = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  return image
}

app.get('/', async (req, res) => {
  res.send({
    hello: 'tileserver'
  })
})

app.get('/image', async (req, res) => {
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
    .toFormat('png')
    .toBuffer()

  res.set({ 'Content-Type': 'image/png' })
  res.send(data)
})

app.listen(port, () => {
  console.log(`Allmaps Tileserver listening at http://localhost:${port}`)
})
