"use strict";

// ----------------------------------------------------------------------------

const ccxt         = require ('../../ccxt.js')

// ----------------------------------------------------------------------------

;(async function main () {
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

  const exchange = new ccxt.litebit ({
    'apiKey': 'YOUR_API_KEY',
    'secret': 'YOUR_SECRET',
  });

  // const currencies = await exchange.fetchCurrencies ();
  // const markets = await exchange.loadMarkets ();
  // const orderBook = await exchange.fetchOrderBook ('NLG-EUR');
  // console.log(markets);
  // console.log(currencies);
  const balance = await exchange.fetchBalance();
  console.log(balance);

}) ();
