const puppeteer = require('puppeteer');

async function startBrowser(){
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true
        })
    } catch (error) {
        console.error('could not create browser instance', error);
    }
    return browser;
}

module.exports = {startBrowser};