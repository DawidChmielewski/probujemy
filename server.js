const express = require('express');
const cors = require('cors');  // Import CORS
const puppeteer = require('puppeteer');

const chrome = require('chrome-aws-lambda');

// Ustawienie ścieżki cache
process.env.PUPPETEER_CACHE_DIR = '/opt/render/.cache/puppeteer';

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());

// Serve the static HTML files
app.use(express.static('public'));

async function trackPackage(trackingNumber) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: await chrome.executablePath,
    args: chrome.args,
    defaultViewport: chrome.defaultViewport
  });
  const page = await browser.newPage();

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    const trackingURL = `https://inpost.pl/sledzenie-przesylek?number=${trackingNumber}`;
    await page.goto(trackingURL, { waitUntil: 'networkidle2' });

    const elementSelector = 'body > div.dialog-off-canvas-main-canvas > div > div > div > main > div:nth-child(3) > div > div.track--parcel--content.trackParcelContent > div';
    await page.waitForSelector(elementSelector, { visible: true, timeout: 60000 });

    const result = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      return element ? element.innerText : 'Nie znaleziono danych';
    }, elementSelector);

    return result;
  } catch (error) {
    console.error('Błąd śledzenia paczki:', error.message);
    return 'Błąd podczas śledzenia paczki';
  } finally {
    await browser.close();
  }
}

app.get('/track', async (req, res) => {
  const trackingNumber = req.query.trackingNumber;
  if (!trackingNumber) {
    return res.json({ success: false, error: 'Numer przesyłki jest wymagany.' });
  }

  try {
    const result = await trackPackage(trackingNumber);
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
