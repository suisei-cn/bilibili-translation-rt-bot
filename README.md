# bilibili-translation-rt-bot

It fetch from Bilibili API for recent images, try to determine if it's a Twitter translation using the following methods:

1. If the image is generated with @cn-matsuri's [translation UI](https://github.com/cn-matsuri/matsuri_translation), we read the tEXt information and find the Twitter link.
2. If we can't find a valid tEXt information from @cn-matsuri, we use OCR.space's OCR to find if the Twitter handle is present. In this case, we don't have the Twitter link.

## Usage

0. Fill in `config.json` according to `config.json.sample`.
1. `npm install`.
1. Run `node main.js` once to update the starting timestamp.
1. Add `node main.js` to cron.

## Notes

OCR.Space API is slow and only recognizes English. If condition permits, using API from Google Cloud Platform ([this](https://cloud.google.com/vision/docs/ocr)) or Microsoft Azure ([this](https://docs.microsoft.com/en-us/azure/cognitive-services/computer-vision/concept-recognizing-text#ocr-optical-character-recognition-api)) would be better. What's more, since they can detect Japanese characters, you can potentially link the translation to original Twitter post!

## Thanks

A big shout out for [RSSHub](https://github.com/DIYgod/RSSHub) (for [v0.1.0](https://github.com/suisei-cn/bilibili-translation-rt-bot/tree/v0.1.0)), [@cn-matsuri](https://github.com/cn-matsuri) and [OCR.space](https://ocr.space/).
