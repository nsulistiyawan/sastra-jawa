const browserObject = require('./browser');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
    path: '../csv/dictionary.csv',
    header: [
        {id: 'indonesia', title: 'Indonesia'},
        {id: 'javanese', title: 'Javanese'},
        {id: 'alphabet', title: 'Alphabet'}
    ]
});

(async () => {
    let browser = await browserObject.startBrowser();
    let mainPage = await browser.newPage();
    const url = 'https://www.sastra.org/katalog/judul?ti_id=1979';
    try {
        await mainPage.goto(url, { waitUntil: 'networkidle0' });
        const subUrls = await mainPage.$$eval('table.ysl-tbl.ysl-tbl-nst > tbody > tr > td > a', links => links.map(a => a.href));

        const startCrawl = Date.now();
        let dlHtmls = [];

        const crawlTasks = subUrls.map(async (url, i) => {
            let page = await browser.newPage();
            await page.goto(url, {
                waitUntil: 'networkidle0',
            });
            const innerHtml = await page.$eval('dl.ysl-dl-hrz', element => element.innerHTML);
            dlHtmls.push(innerHtml);
            console.log(`${url}: done.`);
            await page.close();
        });

        await Promise.all(crawlTasks);
        console.log(`Took ${Date.now() - startCrawl}ms to crawl all pages.`);
        await browser.close();

        console.log('Parsing the dom');
        let dictionaryResults = [];

        const startParser = Date.now();
        const parseTasks = dlHtmls.map(async (dhmtl, i) => {
            const $ = cheerio.load(dhmtl);
            $('dt').each((i, el) => {
                let key = $(el).text().trim().replace("'","").toLowerCase();
                if(key.length > 1){
                    dictionaryResults.push({
                        key: key,
                        value: $(el).nextUntil('dt').text().trim().toLowerCase(),
                    })
                }
            })
        })

        await Promise.all(parseTasks);
        console.log(`Took ${Date.now() - startParser}ms for parse all data`);

        const csvRecords = dictionaryResults.sort(function(a,b) {return (a.key > b.key) ? 1 : ((b.key > a.key) ? -1 : 0);} ).map((result) => {
            return {
                'indonesia': result.key,
                'javanese': result.value,
                'alphabet': result.key.charAt(0)
            }
        });

        await csvWriter.writeRecords(csvRecords);
        console.log('CSV written to csv/dictionary.csv');

    } catch (error) {
        console.error(error);
    }
})();
