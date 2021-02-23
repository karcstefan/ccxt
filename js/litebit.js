'use strict';

// ---------------------------------------------------------------------------

const Exchange = require('./base/Exchange');
const {ExchangeError} = require('./base/errors');


// ---------------------------------------------------------------------------

module.exports = class litebit extends Exchange {
    describe() {
        return this.deepExtend(super.describe(), {
            'id': 'litebit',
            'name': 'Litbit.nl',
            'countries': ['NL'],
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
                    ],
                },
                'private': {
                    'get': [
                        'balance',
                    ],
                    'post': [
                        'trade-order',
                    ],
                    'delete': [
                        'trade-order/{uuid}',
                    ],
                },
            },
        });
    }

    async fetchMarkets(params = {}) {
        let markets = await this.publicGetTradeMarket(params);

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

    async fetchCurrencies(params = {}) {
        let currencies = await this.publicGetCurrency(params);

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

    async fetchOrderBook(symbol, limit, params = {}) {
        const request = {'code': symbol};
        if (limit !== undefined) {
            request.limit = limit
        }

        let orderBook = await this.publicGetTradeMarketCodeBook(request);

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

    async fetchTicker(symbol, params = {}) {
        await this.loadMarkets();

        return await this.fetchTickers([symbol], params);
    }

    async fetchTickers(symbols = undefined, params = {}) {
        await this.loadMarkets();

        const data = [];

        for (let i = 0; i < this.markets.length; i++) {
            const marketData = this.markets[i];
            if (symbols === undefined || symbols.includes(marketData.id)) {
                let ticker = await this.publicGetTradeMarketCodeHistory({code: marketData.id});
                for (let j = 0; j < ticker.data.length; j++) {
                    data.push(ticker.data[j]);
                }
            }
        }

        return data;
    }

    async fetchBalance() {
        const balances = await this.privateGetBalance();
        const free = {};
        const used = {};
        const total = {};

        for (let i = 0; i < balances.data.length; i++) {
            const balanceData = balances.data[i];
            free[balanceData.available.currency] = balanceData.available.amount;
            used[balanceData.reserved.currency] = balanceData.reserved.amount;
            total[balanceData.total.currency] = balanceData.total.amount;
        }

        const results = {
            'info': balances.data,
            'free': free,
            'used': used,
            'total': total,
        };

        for (const [key, value] of Object.entries(total)) {
            results[key] = {
                'free': free[key],
                'used': used[key],
                'total': total[key],
            };
        }
        return results;
    }

    async createOrder (params = {}) {
        const request = {
            'trade-market': params.tradeMarket,
            'amount': params.amount,
            'side': params.side,
            'rate': params.rate,
        };

        const response = await this.privatePostTradeOrder(this.extend (request, params));

        return {
            'info': response.data,
            'id': response.data.uuid,
        };
    }

    async cancelOrder (params = {}) {
        const request = {'uuid': params.uuid};

        return await this.privateDeleteTradeOrderUuid(request);
    }

    sign(path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        const url = this.urls['api'] + '/' + this.version + '/' + this.implodeParams(path, params);
        const query = this.omit (params, this.extractParams (path));

        if (api === 'private') {
            headers = {
                'Accept': 'application/json',
                'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNzNiMDBjMTAxYjU2MzQ3ZjMxNTk2YzJmMjkyMjcwMmM3MzY5NGRjNWJjYmNhMjUzOWRlZWNmZjRhODE2NWRjOThiMTkyZjhkYTJjNjc0Y2IiLCJpYXQiOiIxNjEzNzQ5OTQxLjIzNzQyNyIsIm5iZiI6IjE2MTM3NDk5NDEuMjM3NDMyIiwiZXhwIjoiNDc2OTQyMzU0MS4xOTA1MDQiLCJzdWIiOiIzIiwic2NvcGVzIjpbInVzZXIucmVhZCIsInVzZXIudXBkYXRlIiwibm90aWZpY2F0aW9uLWZpbHRlci5hbGwiLCJub3RpZmljYXRpb24tZmlsdGVyLmRlbGV0ZSIsIm5vdGlmaWNhdGlvbi1maWx0ZXIudXBkYXRlIiwibm90aWZpY2F0aW9uLWZpbHRlci5jcmVhdGUiLCJub3RpZmljYXRpb24tZmlsdGVyLnJlYWQiLCJ0cmFkZS1vcmRlci5hbGwiLCJ0cmFkZS1vcmRlci5kZWxldGUiLCJ0cmFkZS1vcmRlci5jcmVhdGUiLCJ0cmFkZS1vcmRlci5yZWFkIiwiYmFsYW5jZS5hbGwiLCJiYWxhbmNlLmNyZWF0ZSIsImJhbGFuY2UucmVhZCIsImZlZS5hbGwiLCJmZWUucmVhZCIsInVzZXIuYWxsIiwidXNlci5kZWxldGUiXX0.cXZZeVdt1Z95cW6le5-vj5rjuCL5F79HwoILhWZkNNLL-ANv1qbnutjFKMb9QgOSqtz0CDayPuMO6yJYIDBqYNfbnRPMxs8g3PxZ2J2bOijodkXQxQ2-Vp706L99DEh8moRCXVBASSz50fsIk6uyDR2cJymLjgC2VH531MLL3RwxqJKaDWP2o9fpsPKg9PHzhAQqGlyqfmwzMTf-5iF7AtqwfCmDlZlv06BnREAo0RjssBhsAxWWR7MIM8jxZU9rx9d4y_f-NrIZObPaaND8a0bBAhRcmqf1yitv2kZyrNGNEfi1DqiR4SwIW9KBHSbfL-B9fWImaPP-gS3HQ39CSmTDRKSXUSDHoB1iVSyo3zEEvrF5IZFHRiAXXtSlmTadFHEG0kKUoz03Qfa2vc5frvUlotONU6JldpFBE228rZuutEcAfO70KO_tmZjcAg9oGnwSAQuKNmcgm0xNRz5bX9IQTw1RAi0pjo5vfrYdk0Xc9aBSEDG9setkc2_qlBVrO__gBvYaKjTbDcenir0OZgn2woHM4Wy_p7i-tLhzSjHp52OBICChr6M-Wfh1ONgtaYUeNLWiUTXDQ0A7zZlQ3-SOAIrGnmJFAi2B9nqQEpyGomZhYIKFvLbkICak6t5gr6ZHoAuhHHYkWFGom13AHKXQ7upPxHlC6oq3ldjiN_0',
            };
        }

        if (method === 'POST') {
            body = this.json (query);
        }

        return {'url': url, 'method': method, 'body': body, 'headers': headers};
    }
};
