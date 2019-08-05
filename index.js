require('dotenv').config()

const vision = require('@google-cloud/vision')
const client = new vision.ImageAnnotatorClient()

const PLASTIC_BOTTLE_MID = '/m/02rlncx'

const PiCamera = require('pi-camera')
const myCamera = new PiCamera({
  mode: 'photo',
  output: `${__dirname}/refuse.jpg`,
  width: 640,
  height: 480,
  nopreview: true
})

myCamera
  .snap()
  .then(result => {
    client
      .labelDetection(`${__dirname}/refuse.jpg`)
      .then(results => {
        const labels = results[0].labelAnnotations

        // Plastic bottleを検知する
        const detected = labels.some(label => {
          console.debug(label.description + ':' + label.mid)
          return label.mid === PLASTIC_BOTTLE_MID
        })

        if (detected) {
          console.info('Detected Plastic Bottles.')
        }
      })
      .catch(err => {
        console.error('ERROR:', err)
        // TODO 自分のslackに通知
      })
  })
  .catch(error => {
    console.error('ERROR:', error)
    // TODO 自分のslackに通知
  })
