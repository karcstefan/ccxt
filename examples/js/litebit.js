"use strict";

// ----------------------------------------------------------------------------

const ccxt = require ('../../ccxt.js')

// ----------------------------------------------------------------------------

;(async function main () {
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

  const exchange = new ccxt.litebit ({
    'apiKey': 'YOUR_API_KEY',
  });

  // const currencies = await exchange.fetchCurrencies ();
  // const markets = await exchange.loadMarkets ();
  // const orderBook = await exchange.fetchOrderBook ('NLG-EUR');
  // console.log(markets);
  // console.log(currencies);
  // const balance = await exchange.fetchBalance();

  // const tradeOrder = await exchange.createOrder({
  //   'trade-market': 'NLG-EUR',
  //   'amount': '1',
  //   'side': 'buy',
  //   'rate': '0.5',
  // });


  const deleteOrder = await exchange.cancelOrder({
    'uuid': 'f0d3c4fa-1467-4fc4-a6d3-9527c675e699'
  })
  console.log(deleteOrder);

}) ();
