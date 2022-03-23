
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const fs = require("fs");
const fileName = "thumbnail/";
const pg = require("./pgRequest");
// iconv - charset이 utf-8이 아닌 경우 사용

// const pg = require("pgRequest");

const NAVER = "https://comic.naver.com";
const NAVER_WEEKDAYLIST = "/webtoon/weekdayList?week="; // mon, tue, wed, thu, fri, sat, sun, dailyplus
const NAVER_WEBTOONLIST = "#content > div.list_area.daily_img > ul";
const NAVER_LINK = (n) => { // li:nth-child(n) n에 따라 웹툰 링크 달라짐
    return "#content > div.list_area.daily_img > ul > li:nth-child(" + n + ") > div > a";
}
const NAVER_TITLE = "#content > div.comicinfo > div.detail > h2 > span.title";
const NAVER_THUMBNAIL = (n) => {
    return "#content > div.list_area.daily_img > ul > li:nth-child(" + n + ") > div > a > img";
}
const NAVER_AUTHOR = "#content > div.comicinfo > div.detail > h2 > span.wrt_nm";
const NAVER_GENRE = "#content > div.comicinfo > div.detail > p.detail_info > span.genre";
const NAVER_PLATFORM = 1; // 플랫폼 ID

const LEZHIN = "https://www.lezhin.com";
const LEZHIN_WEEKDAYLIST = "/scheduled?day="; // day=0 ~ 6 : 일 ~ 토, day=n : 열흘
const LEZHIN_WEBTOONLIST = "#scheduled-day-";
const LEZHIN_LINK = (w, n) => {
    return "#scheduled-day-" + w + " > li:nth-child(" + n + ") > a";
}
const LEZHIN_TITLE = "#comic-info > div > h2";
const LEZHIN_THUMBNAIL = "#comic-info > picture > source:nth-child(3)";
const LEZHIN_AUTHOR = "#comic-info > div > div.comicInfo__artist > a";
const LEZHIN_GENRE = "#comic-info > div > div.comicInfo__tags";
const LEZHIN_PLATFORM = 2;

const TOOMICS = "https://www.toomics.com"
const TOOMICS_WEEKDAYLIST = "/webtoon/weekly/dow/"; // 1 ~ 7 : 월 ~ 일
const TOOMICS_WEBTOONLIST = "#more_list";
const TOOMICS_LINK = n => { // #more_list > li:nth-child(1) > a
    return "#more_list > li:nth-child(" + n + ") > a"; // 1번째 웹툰 #more_list > li:nth-child(12)
};
const TOOMICS_TITLE = "#contents > div > div.episode > main > div.episode__header > h2";
const TOOMICS_THUMBNAIL = "#contents > div > div.episode > div > div > img"; // attr('src')
const TOOMICS_AUTHOR = "#contents > div > div.episode > main > div.episode__header > div:nth-child(2) > dl > dd";
const TOOMICS_GENRE = "#contents > div > div.episode > main > div.episode__header > span";
const TOOMICS_PLATFORM = 4;

const TOPTOON = "https://toptoon.com";
const TOPTOON_WEEKDAYLIST = "/weekly#weekly"; // weekly1 ~ weekly7 : 월 ~ 일
const TOPTOON_WEEKLIST = "#commonComicList > div";
const TOPTOON_WEBTOONLIST = n => {
    return "#commonComicList > div > ul:nth-child(" + n + ")";
}
const TOPTOON_LINK = (w, n) => {
    return "#commonComicList > div > ul:nth-child(" + w + ") > li:nth-child(" + n + ") > a";
}
const TOPTOON_TITLE = "#episodeBnr > div.bnr_episode_info > div:nth-child(1) > div.tit_area.clearfix > p > span > span";
const TOPTOON_THUMBNAIL = (w, n) => {
    return "#commonComicList > div > ul:nth-child(" + w + ") > li:nth-child(" + n + ") > a > div:nth-child(1)";
} 
const TOPTOON_AUTHOR = "#episodeBnr > div.bnr_episode_info > div:nth-child(1) > div.comic_etc_info > span.comic_wt";
const TOPTOON_GENRE = "#episodeBnr > div.bnr_episode_info > div:nth-child(1) > div.comic_tag";
const TOPTOON_PLATFORM = 3;

const PLATFORMID = {
    NAVER: 1,
    LEZHIN: 2,
    TOOMICS: 4,
    TOPTOON: 3
}

const crawling = async (url) => {
    console.log("crawler start");
    try {
        return await axios.get(url);
    } catch(err) {
        console.log(err);
    }
};

const crawling2 = async (url) => {
    const browser = await puppeteer.launch();

    const page = await browser.newPage();

    await page.goto(url);

    let content = await page.content();
    await browser.close();

    return content;
}

const naverCrawling = async () => {
    const week = ["sun", "mon", "the", "wed", "thu", "fri", "sat", "dailyplus"]; // mon, tue, wed, thu, fri, sat, sun, dailyplus
    const webtoonDataList = [];
    const platform = PLATFORMID.NAVER;

    const sql = "SELECT platformID FROM toon.platform WHERE naver;";

    for (let index = 0; index < week.length; index++) {
        let cycle = null;
        if (index == 7) {
            cycle = 8;
        }
        else {
            cycle = index;
        }
        console.log("naver cycle :", cycle);

        const weekdayListHtml = await crawling(NAVER + NAVER_WEEKDAYLIST + week[index]);
        const weekday = cheerio.load(weekdayListHtml.data);

        console.log("webtoonList.length :", weekday(NAVER_WEBTOONLIST).children().length);
        for (let index2 = 1; index2 <= weekday(NAVER_WEBTOONLIST).children().length; index2++) {

            const link = NAVER + weekday(NAVER_LINK(index2)).attr('href');
            const thumbnail = weekday(NAVER_THUMBNAIL(index2)).attr("src");

            const webtoonHtml = await crawling(link);
            const webtoon = cheerio.load(webtoonHtml.data);

            const title = webtoon(NAVER_TITLE).text();
            const author = webtoon(NAVER_AUTHOR).text().replace(/^\s+/g, '');
            const genre = webtoon(NAVER_GENRE).text();

            // webtoonDataList.push({
            //     link: link,
            //     title: title,
            //     thumbnail: title + ".jpg",
            //     author: author,
            //     genre: genre,
            //     platform: platformID,
            //     cycle: cycle
            // })
            
            // downloadImg(thumbnail, title);

            console.log("data :", {
                link: link,
                title: title,
                thumbnail: title + ".jpg",
                author: author,
                genre: genre,
                platform: platform,
                cycle: cycle
            })
        }
    }

    return webtoonDataList;
}

const lezhinCrawling = async () => {
    const week = [0, 1, 2, 3, 4, 5, 6, "n"];
    const webtoonDataList = [];
    const platform = PLATFORMID.LEZHIN;

    const weekdayListHtml = await crawling2(LEZHIN + LEZHIN_WEEKDAYLIST + 0);
    const weekday = cheerio.load(weekdayListHtml);

    for (let index = 0; index < week.length; index++) {
        let cycle = null;
        if (week[index] == "n") {
            cycle = 7;
        }
        else {
            cycle = week[index];
        }
        console.log("lezhin cycle :", cycle);

        console.log("webtoonList.length :", weekday(LEZHIN_WEBTOONLIST + week[index]).children().length);
        for (let index2 = 1; index2 <= weekday(LEZHIN_WEBTOONLIST + week[index]).children().length; index2++) {

            const link = LEZHIN + weekday(LEZHIN_LINK(week[index], index2)).attr('href');

            const webtoonHtml = await crawling2(link);
            const webtoon = cheerio.load(webtoonHtml);

            const title = webtoon(LEZHIN_TITLE).text();
            const author = webtoon(LEZHIN_AUTHOR).text();
            const genre = webtoon(LEZHIN_GENRE).text();
            const thumbnail = webtoon(LEZHIN_THUMBNAIL).attr("srcset").replace(/,.+$/, '');

            // webtoonDataList.push({
            //     link: link,
            //     title: title,
            //     thumbnail: title + ".jpg",
            //     author: author,
            //     genre: genre,
            //     platform: platform,
            //     cycle: cycle
            // })

            // downloadImg(thumbnail, title);

            console.log("data :", {
                link: link,
                title: title,
                thumbnail: title + ".jpg",
                author: author,
                genre: genre,
                platform: platform,
                cycle: cycle
            })
        }

    }

    return webtoonDataList;
}

const toomicsCrawling = async () => {
    const week = [1, 2, 3, 4, 5, 6, 7];
    const webtoonDataList = [];
    const platform = PLATFORMID.TOOMICS;
    const idReg = new RegExp("\/toon\/([0-9]+)$", 'g');

    for (let index = 0; index < week.length; index++) {
        let cycle = null;
        if (week[index] == 7) {
            cycle = 0;
        }
        else {
            cycle = week[index];
        }
        console.log("toomics cycle :", cycle);

        const weekdayListHtml = await crawling2(TOOMICS + TOOMICS_WEEKDAYLIST + week[index]);
        const weekday = cheerio.load(weekdayListHtml);

        console.log("webtoonList.length :", weekday(TOOMICS_WEBTOONLIST).children().length);
        for (let index2 = 1; index2 <= weekday(TOOMICS_WEBTOONLIST).children().length; index2++) {

            const webtoonID = /\/toon\/([0-9]+)$/g.exec(weekday(TOOMICS_LINK(index2)).attr('href'))[1];
            const link = TOOMICS + "/webtoon/episode/toon/" + webtoonID;
            
            const webtoonHtml = await crawling2(link);
            const webtoon = cheerio.load(webtoonHtml);

            const title = webtoon(TOOMICS_TITLE).text().replace(/\s{2,}/g, '');
            const genre = webtoon(TOOMICS_GENRE).text().replace(/\s/g, '');
            const author = webtoon(TOOMICS_AUTHOR).text();
            const thumbnail = webtoon(TOOMICS_THUMBNAIL).attr("src");

            // webtoonDataList.push({
            //     link: link,
            //     title: title,
            //     thumbnail: title + ".jpg",
            //     author: author,
            //     genre: genre,
            //     platform: platform,
            //     cycle: cycle
            // })

            // downloadImg(thumbnail, title);

            console.log("data :", {
                link: link,
                title: title,
                thumbnail: title + ".jpg",
                author: author,
                genre: genre,
                platform: platform,
                cycle: cycle
            })
        }
    }

    return webtoonDataList;
}

const toptoonCrawling = async () => {
    const week = [1, 2, 3, 4, 5, 6, 7, 8];
    const webtoonDataList = [];
    const platform = PLATFORMID.TOPTOON;

    const weekdayListHtml = await crawling2(TOPTOON + TOPTOON_WEEKDAYLIST + 1);
    const weekday = cheerio.load(weekdayListHtml);
    
    for (let index = 0; index < week.length; index++) {
        let cycle = null;
        if (week[index] == 7) {
            cycle = 0;
        }
        else {
            cycle = week[index];
        }
        console.log("toptoon cycle :", cycle);

        console.log("length :", weekday(TOPTOON_WEBTOONLIST(week[index])).children().length);
        for (let index2 = 1; index2 <= weekday(TOPTOON_WEBTOONLIST(week[index])).children().length; index2++) {

            const link = TOPTOON + weekday(TOPTOON_LINK(week[index], index2)).attr('href');
            const thumbnail = /\((.+)\)/.exec(weekday(TOPTOON_THUMBNAIL(week[index], index2)).attr("style"))[1];

            const webtoonHtml = await crawling2(link);
            const webtoon = cheerio.load(webtoonHtml);

            const title = webtoon(TOPTOON_TITLE).text();
            const author = webtoon(TOPTOON_AUTHOR).text();
            const genre = webtoon(TOPTOON_GENRE).text().replace(/\s/g, '');

            // webtoonDataList.push({
            //     link: link,
            //     title: title,
            //     thumbnail: title + ".jpg",
            //     author: author,
            //     genre: genre,
            //     platform: platform,
            //     cycle: cycle
            // })

            // downloadImg(thumbnail, title);

            console.log("data :", {
                link: link,
                title: title,
                thumbnail: title + ".jpg",
                author: author,
                genre: genre,
                platform: platform,
                cycle: cycle
            });
        }
    }

    return webtoonDataList;
}

const downloadImg = async (url, title) => {
    fs.readdir('thumbnail', (err) => {
        if(err){
            console.error("thumbnail 폴더가 없어 thumbnail 폴더를 생성합니다 ")
            fs.mkdirSync("thumbnail");
        }
    });

    const img = await axios.get(url , {
        responseType: 'arraybuffer'
    });

    fs.writeFileSync(fileName + title + '.jpg', img.data);
}

const saveToDB = async (webtoonDataList) => {
    // 조회수 가져오기
    const viewCount = 0
    const sqlList = [];
    const valuesList = [];

    // webtoon 테이블에 추가
    for (let index = 0; index < webtoonDataList.length; index++) {
        sqlList.push(
            "INSERT TO toon.webtoon (title, thumbnail, link, platformID, viewCount, author) VALUES ($1, $2, $3, $4, $5, $6);"
        );
        values.push([
            webtoonDataList[index].title,
            webtoonDataList[index].thumbnail,
            webtoonDataList[index].link,
            webtoonDataList[index].platform,
            viewCount,
            webtoonDataList[index].author
        ]);
    }

    try {
        await pg(sqlList, valuesList);
    }
    catch(err) {
        console.log(err);
    }

    const data = [ // cycle 테이블에 저장할 때 쓰임
        // {
        //     webtoonID: "",
        //     cycle: ""
        // }
    ];

    // cycle 테이블에 추가
    for (let index = 0; index < webtoonDataList.length; index++) {
        const sql4webtoonID = "SELECET webtoonID FROM webtoon WHERE title=$1 and platform=$2;"
        const values4webtoonID = [webtoonDataList[index].title, webtoonDataList[index].platform];
        try {
            data.push({
                webtoonID: await pg(sql4webtoonID, values4webtoonID).data[0],
                cycle: webtoonDataList[index].cycle
            })
        }
        catch(err) {
            console.log(err);
        }
    }

    const sqlList2 = [];
    const valuesList2 = [];
    for (let index = 0; index < data.length; index++) {
        sqlList2.push(
            "INSERT INTO toon.cycle (webtoonID, cycle) VALUES ($1, $2);"
        );
        valuesList2.push([data[index].webtoonID, data[index].cycle]);
    }

    try {
        await pg(sqlList2, valuesList2);
    }
    catch(err) {
        console.log(err);
    }
}

const bringWebtoonData = async () => {
    const naverWebtoons = await naverCrawling();
    const lezhinWebtoons = await lezhinCrawling();
    const toomicsWebtoons = await toomicsCrawling();
    const toptoonWebtoons = await toptoonCrawling();

    const webtoons = naverWebtoons.concat(lezhinWebtoons, toomicsWebtoons, toptoonWebtoons);

    return webtoons;
}

// const test = () => {
//     console.log(typeof [1, 2, 3, 4]);
// }

// test();
