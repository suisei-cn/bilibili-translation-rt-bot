# bilibili-translation-rt-bot

Note: This is only a proof of concept. It's obviously not using the best approach of detection but it works :)

## Usage

0. Fill in `config.json` according to `config.json.sample`.
1. `npm install`.
1. Run `node main.js` once to update the starting timestamp.
1. Add `node main.js` to cron.

## Notes

OCR.Space API is slow and only recognizes English. If condition permits, using API from Google Cloud Platform ([this](https://cloud.google.com/vision/docs/ocr)) or Microsoft Azure ([this](https://docs.microsoft.com/en-us/azure/cognitive-services/computer-vision/concept-recognizing-text#ocr-optical-character-recognition-api)) would be better. What's more, since they can detect Japanese characters, you can potentially link the translation to original Twitter post!

## Thanks

A big shout out for [RSSHub](https://github.com/DIYgod/RSSHub) and [OCR.space](https://ocr.space/).
