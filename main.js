const axios = require("axios");
const config = require("./config.json");
const fs = require("fs");

const useOCR = config.USE_OCR === false ? false : Boolean(config.OCR_SPACE_KEY);

async function getBilibiliImages(uid, page = 1) {
  while (true) {
    let data = await axios
      .get(
        `https://api.vc.bilibili.com/link_draw/v1/doc/doc_list?uid=${uid}&page_num=${page}&page_size=3&biz=all`
      )
      .then((x) => x.data);
    return data.data.items || [];
  }
}

class BilibiliProvider {
  page = -1;
  uid = 0;
  finished = false;
  constructor(uid) {
    this.uid = uid;
  }

  async next() {
    this.page++;
    let failed = false;
    let result = await getBilibiliImages(this.uid, this.page).catch((err) => {
      console.log(`Get page ${this.page} of uid ${this.uid} failed:`, err);
      failed = true;
      this.finished = true;
    });
    if (result.length === 0) this.finished = true;
    return failed ? [] : result;
  }
}

function pre_job() {
  console.log("------------------------");
  console.log(`Current time:${new Date().toLocaleString()}`);
  console.log("------------------------");
}

function saveDateNow(time) {
  let timeNum = Number(time);
  fs.writeFileSync(
    "./config.json",
    JSON.stringify(
      Object.assign(config, {
        since: timeNum,
      })
    )
  );
}

async function getTextFromImgUrl(url) {
  let resp = await axios.get(url);
  let image = resp.data;
  let textLoc = image.indexOf("tEXt");
  if (textLoc === -1) {
    return useOCR ? await getOCRTextFromImgUrl(url) : false;
  }
  let ptr = textLoc + 4;
  while (image[ptr] != "}" && ptr < image.length) ptr++;
  if (image[ptr] != "}") return false;
  let textData;
  try {
    textData = JSON.parse(image.slice(textLoc + 4, ptr + 1));
  } catch (e) {
    return false;
  }
  return textData.tweet || true;
}

async function getOCRTextFromImgUrl(url) {
  try {
    let resp = await axios.get(
      `https://api.ocr.space/parse/imageurl?apikey=${config.OCR_SPACE_KEY}&url=${url}`
    );
    console.log("tz", resp.data);
    return resp.data.ParsedResults[0].ParsedText.includes(
      config.TWITTER_HANDLE
    );
  } catch (error) {
    console.error(`OCR API Error: ${error}`);
    if (String(error).includes("socket")) {
      console.error("Socket error. Don't ignore the images.");
      return -1;
    }
  }
  return false;
}

(async () => {
  pre_job();
  if (!config.since) {
    saveDateNow(new Date());
    console.log("Recording start time only. Next run will start to publish.");
    return;
  }
  console.log("Fetching posts from Bilibili...");
  let provider = new BilibiliProvider(config.BILIBILI_UID);
  let pubQueue = [];
  let firstPubTime = 0;

  while (!provider.finished) {
    let current = await provider.next();
    let breakNow = true;
    for (let item of current) {
      if (item.description !== "" || item.pictures.length === 0) continue;
      let theDate = new Date((item.ctime || 0) * 1000);

      if (theDate == 0) {
        console.warn("Bad timestamp for post:", item);
      } else if (theDate < config.since) {
        breakNow = true;
        break;
      }

      if (firstPubTime < theDate) firstPubTime = theDate;
      // P r o c e s s i n g
      for (const imgURL of item.pictures.map((x) => x.img_src)) {
        let pub = await getTextFromImgUrl(imgURL);
        pub === -1 && process.exit(0); // Network error
        pub &&
          pubQueue.push({
            imgurl: imgURL,
            tweet: typeof pub === "string" ? pub : undefined,
          });
      }
    }
    if (breakNow) break;
  }

  console.log(`Search completed. ${pubQueue.length} items to publish.`);

  for (const item of pubQueue) {
    await axios.post(
      `https://api.telegram.org/bot${config.BOT_KEY}/sendMessage`,
      {
        chat_id: config.CHAT_ID,
        text: `${config.TELEGRAM_MESSAGE_TAG || ""}[\u200b](${item.imgurl})\n${
          item.tweet && `[Twitter 原文](${item.tweet})`
        }`,
        parse_mode: "markdown",
      }
    );
  }

  saveDateNow(firstPubTime);
})();
