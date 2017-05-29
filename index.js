var crypto = require('crypto'),
    extend = require('xtend'),
    request = require('request'),
    querystring = require('querystring');

const API_HOST = "https://btc-e.nz",
      PUBLIC_V3 = "/api/3",
      TRADE = "/tapi";

var BTCExchange = function(key, secret) {
  this.apiHost = API_HOST;
  this.privatePath = TRADE;
  this.publicPath = PUBLIC_V3;

  this.key = key;
  this.secret = secret;
}

BTCExchange.prototype.v3info = function() {
  return this.publicV3ApiRequest('info')
}

BTCExchange.prototype.v3ticker = function(ticker = 'btc_usd') {
  return this.publicV3ApiRequest('ticker/' + ticker);
}

BTCExchange.prototype.v3depth = function(ticker = 'btc_usd', limit = 150) {
  return this.publicV3ApiRequest('depth/' + ticker, { limit });
}

BTCExchange.prototype.v3trades = function(ticker = 'btc_usd', limit = 150) {
  return this.publicV3ApiRequest('trades/' + ticker, { limit });
}

BTCExchange.prototype.publicV3ApiRequest = function(path, params = {}) {
  var promise = new Promise(function (resolve, reject) {
    this._get(this.publicPath + '/' + path, params, function(error, data) {
      if (error)
        reject(error || data);

      resolve(data);
    })
  }.bind(this));

  return promise;
}

BTCExchange.prototype.getInfo = function() {
  return this.tradeApiRequest('getInfo');
}

BTCExchange.prototype.trade = function(pair, type, rate, amount) {
  return this.tradeApiRequest('Trade', { pair, type, rate, amount });
}

BTCExchange.prototype.activeOrders = function(pair = '') {
  return this.tradeApiRequest('ActiveOrders', { pair })
}

BTCExchange.prototype.orderInfo = function(order_id) {
  return this.tradeApiRequest('OrderInfo', { order_id })
}

BTCExchange.prototype.cancelOrder = function(order_id) {
  return this.tradeApiRequest('CancelOrder', { order_id });
}

BTCExchange.prototype.tradeHistory = function(from = 0, count = 1000, from_id = 0, end_id, order = 'DESC', since = 0, end, pair = '') {
  return this.tradeApiRequest('TradeHistory', { from, count, from_id, end_id, order, since, end, pair });
}

BTCExchange.prototype.transHistory = function(from = 0, count = 1000, from_id = 0, end_id, order = 'DESC', since = 0, end) {
  return this.tradeApiRequest('TransHistory', { from, count, from_id, end_id, order, since, end });
}

BTCExchange.prototype.tradeApiRequest = function(method, params = {}) {
  var opts = this.buildPayload(params, method);

  var promise = new Promise(function(resolve, reject) {
    this._post(this.privatePath, opts, function(err, data) {
      if (err || data.success != 1)
        reject(err || data.error);

      resolve(data);
    })
  }.bind(this));

  return promise;
}

BTCExchange.prototype.nonce = function() {
  return Math.round(new Date().getTime() / 100) - 12000000000
}

BTCExchange.prototype.sign = function(data) {
  var payload = querystring.stringify(data);

  var hash = crypto.createHmac('sha512', this.secret)
    .update(payload)
    .digest('hex');

  return hash;
}

BTCExchange.prototype.buildPayload = function(data, method) {
  var nonce = this.nonce();
  var params = extend(data, { method: method, nonce: nonce });
  var sign = this.sign(params);

  return {
    params: params,
    headers: {
      Sign: sign,
      Key: this.key
    }
  }
}

BTCExchange.prototype._get = function(path, params, callback) {
  var url = this.apiHost + path + "?" + querystring.stringify(params);

  request.get({
    url: url,
    strictSSL: true,
    json: true
  }, function(error, response, body) {
    if (!error && !!body.status && body.status !== 'OK')
      error = new Error(body.description || body.error_message);

    callback(error, body || {});
  })
}

BTCExchange.prototype._post = function(path, opts, callback) {
  var url = this.apiHost + path;

  request.post({
    url: url,
    strictSSL: true,
    json: true,
    form: querystring.stringify(opts.params),
    headers: opts.headers
  }, function(error, response, body) {
    if (!error && !!body.status && body.status !== 'OK')
      error = new Error(body.description || body.error_message);

    callback(error, body || {});
  })
}

module.exports = BTCExchange;
