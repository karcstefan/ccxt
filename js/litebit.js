'use strict';

// ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { ExchangeError } = require ('./base/errors');


// ---------------------------------------------------------------------------

module.exports = class litebit extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'litebit',
            'name': 'Litbit.nl',
            'countries': [ 'NL' ],
            'has': {
                'fetchMarkets': true,
                'fetchCurrencies': true,
            },
            'version': 'v2',
            'urls': {
                'logo': '',
                'api': 'https://localhost/api',
                'www': 'https://localhost/',
            },
            'api': {
                'public': {
                    'get': [
                        'trade-market',
                        'trade-market/{code}/book',
                        'trade-market/{code}/history',
                        'currency',
                    ]
                }
            }
        });
    }

    async fetchMarkets (params = {}) {
      let markets = await this.publicGetTradeMarket (params);

      const results = [];
      for (let i = 0; i < markets.data.length; i++) {
        const marketData = markets.data[i];
        results.push({
          'id': marketData.code,
          'symbol': marketData.code,
          'active': marketData.is_active,
          'base': marketData.base_currency.data.code,
          'baseId': marketData.base_currency.data.code.toLowerCase(),
          'quote': marketData.quote_currency.data.code,
          'quoteId': marketData.quote_currency.data.code.toLowerCase(),
          'precision': {
            'price': marketData.decimals,
            'cost': marketData.decimals,
            'amount': marketData.decimals,
          },
          // TODO: Missing limits/fees
          'info': marketData,
        });
      }

      return results;
    }

    async fetchCurrencies (params = {}) {
      let currencies = await this.publicGetCurrency (params);

      const results = [];
      for (let i = 0; i < currencies.data.length; i++) {
        const currencyData = currencies.data[i];
        results.push({
          'id': currencyData.code.toLowerCase(),
          'code': currencyData.code,
          'name': currencyData.name,
          'active': true,
          'precision': currencyData.decimals,
          // TODO: missing limits/fee
          'info': currencyData,
        })
      }

      return results;
    }

    async fetchOrderBook (symbol, limit, params = {}) {
      const request = { 'code': symbol };
      if (limit !== undefined) {
        request.limit = limit
      }

      let orderBook = await this.publicGetTradeMarketCodeBook (request);

      const results = [];
      for (let i = 0; i < orderBook.data.length; i++) {
        const orderBookData = orderBook.data[i];
        results.push({
          'buy': orderBookData.buy,
          'ask': orderBookData.sell,
          'timestamp': orderBookData.timestamp,
          'nonce': null,
        })
      }

      return results;
    }

    async fetchTicker (symbol, params = {}) {
      await this.loadMarkets ();

      return await this.fetchTickers ([symbol], params);
    }

    async fetchTickers (symbols = undefined, params = {}) {
      await this.loadMarkets ();

      const data = [];

      for (let i = 0; i < this.markets.length; i++) {
        const marketData = this.markets[i];
        if (symbols === undefined || symbols.includes(marketData.id)) {
          let ticker = await this.publicGetTradeMarketCodeHistory ({ code: marketData.id });
          for (let j = 0; j < ticker.data.length; j++) {
            data.push(ticker.data[j]);
          }
        }
      }

      return data;
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
      const url = this.urls['api'] + '/' + this.version + '/' + this.implodeParams (path, params);
      return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }
};
