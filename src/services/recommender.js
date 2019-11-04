'use strict';

const Gateway = require('./../gateway');
const url = (method, get) => (
    `http://${get ? '168.63.28.116:5000' : '40.115.41.26:5000'}/api/v1${method}`
);
const accounts = '/accounts';
const products = '/products';

module.exports = Gateway('/recommender')
    .defaults({
        syncHeaders: ['country', 'authorization']
    })
    .get(accounts, url(accounts, true)).post(accounts, url(accounts)).delete(accounts, url(accounts))
    .get(products, url(products, true)).post(products, url(products)).delete(products, url(products));
  
    