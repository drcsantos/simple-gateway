'use strict';

const helmet = require('helmet');
const csp = require('../content-security-policy.json');

module.exports = () =>
	helmet({
		contentSecurityPolicy: {
			directives: csp
		},
		frameguard: {
			action: 'sameorigin'
		},
		hsts: true,
		xssFilter: true,
		referrerPolicy: false,
		hidePoweredBy: true,
		ieNoOpen: true,
		noSniff: true,
		noCache: false,
		hpkp: false,
		dnsPrefetchControl: false
	});
