'use strict';

const port = process.env.PORT || '3000';
const helmet = require('./helmet');

// Services
const api = require('./services');
const app = require('express')();

app.get('/health-check', function (req, res) {
    res.send('OK');
});

app.get('/robots.txt', (req, res, next) => {
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /');
});

app.use(helmet());

// Registra endpoints dos serviços
api.register(app);

app.listen(port, () => console.log("Service listening to port 3000"));