import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Fix __dirname issue in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RATES_FILE = path.join(__dirname, 'rates.json');
const apiKey = process.env.EXCHANGE_API_KEY;
const API_URL = `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${apiKey}&symbols=USD,KES,BTC,ETH,USDT`;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

// Function to fetch exchange rates from the API
async function fetchExchangeRates() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    throw error;
  }
}

// Function to read rates from rates.json
function readRates() {
  if (fs.existsSync(RATES_FILE)) {
    const data = fs.readFileSync(RATES_FILE);
    return JSON.parse(data);
  }
  return null;
}

// Function to save rates to rates.json
function saveRates(rates) {
  fs.writeFileSync(RATES_FILE, JSON.stringify(rates, null, 2));
}

// Route to get the current exchange rate
router.get('/', async (req, res) => {
  let rates = readRates();

  if (rates && rates.updatedAt) {
    const timeElapsed = Date.now() - new Date(rates.updatedAt).getTime();

    // Check if the rates were updated less than 2 minutes ago
    if (timeElapsed < CACHE_DURATION) {
      return res.json({ success: true, rates });
    }
  }

  // Fetch new rates if they are outdated or not available
  try {
    const newRates = await fetchExchangeRates();
    newRates.updatedAt = new Date().toISOString(); // Add the current timestamp
    saveRates(newRates); // Save the new rates to rates.json
    res.json({ success: true, rates: newRates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch rates' });
  }
});

export default router;