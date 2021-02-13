"use strict";

// ----------------------------------------------------------------------------

const ccxt         = require ('../../ccxt.js')

// ----------------------------------------------------------------------------

;(async function main () {

  const exchange = new ccxt.litebit ({
    'apiKey': 'YOUR_API_KEY',
    'secret': 'YOUR_SECRET',
  });

  // const currencies = await exchange.fetchCurrencies ();
  // const markets = await exchange.loadMarkets ();
  const orderBook = await exchange.fetchOrderBook ('NLG-EUR');
  // console.log(markets);
  // console.log(currencies);
  console.log(orderBook);

}) ();
