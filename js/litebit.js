'use strict';

// ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');

// ---------------------------------------------------------------------------

module.exports = class litebit extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'litebit',
            'name': 'Litbit.nl',
            'countries': ['NL'],
            'has': {
                'fetchMarkets': true,
                'fetchCurrencies': true,
                'fetchTradingLimits': false,
                'fetchTradingFees': false,
                'fetchFundingLimits': false,
                'fetchTicker': true,
                'fetchOrderBook': true,
                'fetchTrades': false,
                'fetchOHLCV': false,
                'fetchBalance': true,
                'cancelOrder': true,
                'createOrder': true,
                'editOrder': false,
                'fetchOrder': true,
                'fetchOrders': true,
                'fetchOpenOrders': true,
                'fetchMyTrades': true,
                'fetchDepositAddress': false,
                'fetchDeposits': false,
                'fetchWithdrawals': false,
                'fetchTransactions': false,
                'fetchLedger': false,
                'withdraw': false,
                'transfer': false,
            },
            'version': 'v1',
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
                        'trade-order',
                        'trade-order/{uuid}',
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

    async fetchMarkets (params = {}) {
        const markets = await this.publicGetTradeMarket (params);
        const results = [];
        for (let i = 0; i < markets.data.length; i++) {
            const marketData = markets.data[i];
            results.push ({
                'id': marketData.code,
                'symbol': marketData.code,
                'active': marketData.is_active,
                'base': marketData.base_currency.data.code,
                'baseId': marketData.base_currency.data.code.toLowerCase (),
                'quote': marketData.quote_currency.data.code,
                'quoteId': marketData.quote_currency.data.code.toLowerCase (),
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
        const currencies = await this.publicGetCurrency (params);
        const results = [];
        for (let i = 0; i < currencies.data.length; i++) {
            const currencyData = currencies.data[i];
            results.push ({
                'id': currencyData.code.toLowerCase (),
                'code': currencyData.code,
                'name': currencyData.name,
                'active': true,
                'precision': currencyData.decimals,
                // TODO: missing limits/fee
                'info': currencyData,
            });
        }
        return results;
    }

    async fetchOrderBook (symbol, limit, params = {}) {
        const request = { 'code': symbol };
        if (limit !== undefined) {
            request.limit = limit;
        }
        const orderBook = await this.publicGetTradeMarketCodeBook (request);
        const results = [];
        for (let i = 0; i < orderBook.data.length; i++) {
            const orderBookData = orderBook.data[i];
            results.push ({
                'buy': orderBookData.buy,
                'ask': orderBookData.sell,
                'timestamp': orderBookData.timestamp,
                'nonce': null,
            });
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
            if (symbols === undefined || symbols.includes (marketData.id)) {
                const ticker = await this.publicGetTradeMarketCodeHistory ({ 'code': marketData.id });
                for (let j = 0; j < ticker.data.length; j++) {
                    data.push (ticker.data[j]);
                }
            }
        }
        return data;
    }

    async fetchBalance () {
        const balances = await this.privateGetBalance ();
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
        Object.keys (total).forEach ((key) => {
            results[key] = {
                'free': free[key],
                'used': used[key],
                'total': total[key],
            };
        });
        return results;
    }

    async createOrder (params = {}) {
        const request = {
            'trade-market': params.tradeMarket,
            'amount': params.amount,
            'side': params.side,
            'rate': params.rate,
        };
        const response = await this.privatePostTradeOrder (this.extend (request, params));
        return {
            'info': response.data,
            'id': response.data.uuid,
        };
    }

    async cancelOrder (params = {}) {
        const request = { 'uuid': params.uuid };
        return await this.privateDeleteTradeOrderUuid (request);
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        const response = await this.privateGetTradeOfferUuid ({ 'uuid': id });
        return this.transformOrderData (response.data);
    }

    async fetchOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        const response = await this.privateGetTradeOffer ();
        const output = [];
        for (let i = 0; i < response.data.length; i++) {
            const orderData = this.transformOrderData (response.data[i]);
            output.push (orderData);
        }
        return output;
    }

    transformOrderData (responseData) {
        return {
            'id': responseData.uuid,
            'clientOrderId': responseData.uuid,
            'datetime': responseData.created_at,
            'timestamp': parseInt ((new Date (responseData.created_at).getTime () / 1000).toFixed (0)),
            'lastTradeTimestamp': parseInt ((new Date (responseData.updated_At).getTime () / 1000).toFixed (0)),
            'status': responseData.status,
            'symbol': responseData.trade_market,
            'type': responseData.type,
            'timeInForce': responseData.time_in_force,
            'side': responseData.side,
            'amount': responseData.amount,
            'filled': responseData.amount_filled,
            'cost': responseData.amount_cost,
            'info': responseData,
        };
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        const url = this.urls['api'] + '/' + this.version + '/' + this.implodeParams (path, params);
        const query = this.omit (params, this.extractParams (path));
        headers = headers || {};
        headers.Accept = 'application/json';
        if (api === 'private') {
            headers.Authorization = 'Bearer ' + this.apiKey;
        }
        if (method === 'POST') {
            body = this.json (query);
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }
};
