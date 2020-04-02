const Parser = require("rss-parser");
const parser = new Parser();
const cheerio = require("cheerio");
const axios = require("axios");
const config = require("./config.json");
const fs = require("fs");

function saveDateNow() {
  fs.writeFileSync(
    "./config.json",
    JSON.stringify(
      Object.assign(config, {
        since: dateNow
      })
    )
  );
}

function extractUrlFromText(text) {
  let $ = cheerio.load(text);
  return $("img")
    .map((_, n) => n.attribs.src)
    .get();
}

async function getOCRTextFromImgUrl(url) {
  try {
    let resp = await axios.get(
      `https://api.ocr.space/parse/imageurl?apikey=${config.OCR_SPACE_KEY}&url=${url}`
    );
    console.log("tz", resp.data);
    return resp.data.ParsedResults[0].ParsedText.includes(config.TWITTER_HANDLE);
  } catch (error) {
    console.error(`OCR API Error: ${error}`);
    if (String(error).includes("socket")) {
      console.error("Socket error. Don't ignore the images.");
      return -1;
    }
  }
  return 0;
}

const dateNow = Number(new Date());

(async () => {
  if (!config.since) {
    saveDateNow();
    console.log("Recording start time only. Next run will start to publish.");
    return;
  }
  console.log("Fetching posts from Bilibili...");

  let feed = await parser.parseURL(
    `https://rsshub.app/bilibili/user/dynamic/${config.BILIBILI_UID}`
  );

  let potentialRt = [];
  let pubQueue = [];

  feed.items.forEach(item => {
    if (item.title.includes("分享图片")) {
      potentialRt.push(item);
    } else {
      console.log(`Ignoring ${item.title} (${item.link})`);
    }
  });

  for (const item of potentialRt.slice(0, 1)) {
    let pubTime = new Date(item.isoDate);
    if (pubTime < config.since) {
      console.log("Message too old. Stopping.");
      break;
    }
    let imgUrls = extractUrlFromText(item.content || []);
    for (const img of imgUrls) {
      console.log(`Searching ${img}`);
      let pub = await getOCRTextFromImgUrl(img);
      pub === -1 && process.exit(0);
      pub &&
        pubQueue.push({
          url: item.link,
          imgurl: img
        });
    }
  }

  console.log(`Search completed. ${pubQueue.length} items to publish.`);
  for (const item of pubQueue.reverse()) {
    await axios.post(
      `https://api.telegram.org/bot${config.BOT_KEY}/sendMessage`,
      {
        chat_id: config.CHAT_ID,
        text: `[\u200b](${item.imgurl})\n[B博原文](${item.url})`,
        parse_mode: "markdown"
      }
    );
  }

  saveDateNow();
})();
