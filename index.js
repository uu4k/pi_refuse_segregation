require('dotenv').config()
const dateformat = require('dateformat')
const vision = require('@google-cloud/vision')
const { Storage } = require('@google-cloud/storage')
const tmp = require('tmp')
const fs = require('fs')

const PLASTIC_BOTTLE_MID = '/m/02rlncx'
const CAMERA_OUTPUT_PATH = `${__dirname}/refuse.jpg`

const PiCamera = require('pi-camera')
const myCamera = new PiCamera({
  mode: 'photo',
  output: CAMERA_OUTPUT_PATH,
  width: 640,
  height: 480,
  nopreview: true
})

const storage = new Storage({
  projectId: process.env.PROJECT_ID
})
const bucketName = process.env.BUCKET_NAME

const client = new vision.ImageAnnotatorClient()

const now = new Date()

myCamera
  .snap()
  .then(result => {
    // 画像をGCSにアップロード
    const now = new Date()
    storage
      .bucket(bucketName)
      .upload(CAMERA_OUTPUT_PATH, {
        destination: `${dateformat(now, 'yyyymmdd/hhMMss')}.jpg`,
        gzip: true
      })
      .then(res => {
        console.info(`${CAMERA_OUTPUT_PATH} uploaded to ${bucketName}.`)
      })
      .catch(err => {
        console.error('ERROR:', err)
      })

    client
      .labelDetection(`${__dirname}/refuse.jpg`)
      .then(results => {
        const labels = results[0].labelAnnotations

        // Plastic bottleを検知する
        const detected = labels.some(label => {
          return label.mid === PLASTIC_BOTTLE_MID
        })

        if (detected) {
          console.info('Detected Plastic Bottles.')
        }

        // 結果もs3に送信
        tmp.file((err, path, fd, cleanupCallback) => {
          if (err) throw err

          labels.forEach(label => {
            fs.writeFileSync(path, label.description + ':' + label.mid)
          })

          storage
            .bucket(bucketName)
            .upload(CAMERA_OUTPUT_PATH, {
              destination: `${dateformat(now, 'yyyymmdd/hhMMss')}_${
                detected ? 'detected' : 'none'
              }.log`,
              gzip: true
            })
            .then(res => {
              console.info(`labels uploaded to ${bucketName}.`)
            })
            .catch(err => {
              console.error('ERROR:', err)
            })
        })
      })
      .catch(err => {
        console.error('ERROR:', err)
        // TODO 自分のslackに通知
      })
  })
  .catch(err => {
    console.error('ERROR:', err)
    // TODO 自分のslackに通知
  })
