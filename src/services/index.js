'use strict';

const cors = require('cors');
const bodyParser = require('body-parser');
const requestIp = require('request-ip');
const useragent = require('express-useragent');
const morgan = require('morgan');
const compression = require('compression');

const cep = require('./address-service');
const genderize = require('./genderize');
const recommender = require('./recommender');

const API_ROUTE = '/api';

function init(app) {

    app.use(morgan());
    app.use(compression());
    app.use(useragent.express());

    // Habilita CORS
    const whitelist = ['*'];
    app.use(
        cors({
            origin: (origin, callback) => {
                if (whitelist.indexOf(origin) !== -1 || !origin) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        })
    );
    // Parsea body para put e post
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: false
    }));

    // Pega o ip do request
    app.use(requestIp.mw());
}

function register(app, service) {
    service
        .defaults({
            headers: {
                'Content-Type': 'application/json',
                'request-origin': 'b2b-gateway'
            }
        })
        .logging({
            isDebug: false, // !IS_PROD,
            debug: msg => console.debug(msg),
            info: msg => console.info(msg),
            warn: msg => console.warn(msg),
            error: msg => console.error(msg)
        })
        .register(app, API_ROUTE);
}

module.exports = {
    cep,
    genderize,
    recommender,
    register: function (app) {
        init(app);
        register(app, cep);
        register(app, genderize);
        register(app, recommender);
    }
};;