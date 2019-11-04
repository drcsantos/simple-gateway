'use strict';

// TODO: Resolver https://github.com/taskrabbit/elasticsearch-dump/issues/186
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const client = require('./http-client');
const circuitBreaker = require('opossum');
const mergeOptions = require('merge-options');

const routeConfig = (method, args) => {
	if (args.length >= 3) {
		return {
			method,
			path: args[0],
			url: args[1],
			request: args[2]
		};
	} else if (args.length === 2) {
		if (typeof args[1] === 'object') {
			return {
				method,
				url: args[0],
				request: args[1]
			};
		}
		return {
			method,
			path: args[0],
			url: args[1]
		};
	} else {
		return {
			method,
			url: args[0]
		};
	}
};

function Gateway(pathRoute) {
	this.path = pathRoute || '/';
	this.routes = [];
	this.templateRoot = '';
	this.logger = null;
	this.defaultOptions = {
		client: 'axios',
		syncHeaders: [],
		// Axios settings put here
		// Http settings put here
		circuitBraker: {
			timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
			errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
			resetTimeout: 30000 // After 30 seconds, try again.
		}
	};

	this.logging = options => {
		this.logger = options;
		return this;
	};

	this.defaults = options => {
		this.defaultOptions = mergeOptions(this.defaultOptions, options);
		return this;
	};

	this.log = (level, message) => {
		if (this.logger) {
			if (typeof this.logger === 'function') {
				this.logger(`[${level.toUpperCase()}]: ${message}`);
			} else if (!(level === 'debug' && !this.logger.isDebug)) {
				const logFunc = this.logger[level];
				if (logFunc) {
					logFunc(message);
				}
			}
		}
	};

	/**
	 * Cria um objeto Gateway Route.
	 * @param {object} props Objeto com os parametros de configuração da rota
	 * @returns {object} gateway Route
	 */
	this.route = props => {
		const method = props.method || 'get';
		const parameters = props.request || {};
		this.routes.push({
			path: props.path || '/',
			method,
			handler: async (req, res, next) => {
				const options = parameters.options || {};
				options.method = method;
				options.url = props.url;

				// Executa ação antes do request se existir
				if (parameters.before) {
					this.log('debug', 'Processing before action from route.');
					parameters.before(req, res, next);
				}

				if (req.body && Object.keys(req.body).length > 0) {
					this.log('debug', 'Copying data object from body.');
					options.data = req.body;
				}

				if (req.query) {
					const queryString = Object.keys(req.query)
						.map(key => `${key}=${req.query[key]}`)
						.join('&');

					if (queryString && queryString.length > 0) {
						this.log(
							'debug',
							`Building query string. QueryString: ${queryString}`
						);
						options.url = `${options.url}?${queryString}`;
					}
				}

				// Monta a url de serviço baseado nos parametros
				const routeParameters = options.url.match(/:[^\d]\w+/g);
				if (routeParameters) {
					this.log(
						'debug',
						`There are route parameters. Building url.`
					);
					const getParamValue = param => {
						const value = req.params[param];
						if (!value) {
							this.log(
								'warn',
								`Value for "${param}" parameter not found`
							);
						}
						return value;
					};
					routeParameters.forEach(param => {
						options.url = options.url.replace(
							`${param}`,
							getParamValue(param.slice(1))
						);
					});
				}

				this.log(
					'debug',
					`Request Object: ${JSON.stringify(
						mergeOptions(this.defaultOptions, options)
					)}`
				);
				this.log(
					'info',
					`Request: [${options.method.toUpperCase()}] ${options.url}`
				);

				const settings = mergeOptions(this.defaultOptions, options);
				const breaker = circuitBreaker(client, settings.circuitBraker);

				if (settings.circuitBraker.fallback) {
					breaker.fallback((error) => {
						return {
							status: 200, // TODO: Fallback status
							data: settings.circuitBraker.fallback()
						};
					});
				}

				settings.syncHeaders.forEach(key => {
					const value = req.header(key);
					if (value) {
						settings.headers[key] = value;
					}
				});

				// Perform request
				breaker
					.fire(settings)
					.then(response => {
						res.locals.bundle = response.data;
						res.locals.statusCode = response.status;

						this.log(
							'debug',
							`Response DATA: ${JSON.stringify(response.data)}`
						);
						this.log(
							'warn',
							`Response: [${options.method.toUpperCase()}] ${
									options.url
								} ${response.status}${response.data ? ' [DATA]' : ''}`
						);
						// Executa ação depois do request se existir
						if (parameters.after) {
							this.log(
								'debug',
								'Processing after action from route.'
							);
							parameters.after(req, res, next);
						}

						// Finaliza a esteira de resposta
						this.end(req, res);
					})
					.catch(error => {
						const response = error.response;
						//this.log('error', response ? response : error);

						res.status(500).send({
							status: response ? response.status : 500,
							statusText: response ? response.statusText : error.message,
							message: `[Gateway Error]: ${error.message}`
						});
					});
			}
		});

		return this;
	};

	/**
	 * Finaliza o middleware enviando uma resposta e o status code
	 * @param {*} req request express
	 * @param {*} res response express
	 * @returns {*} response
	 */
	this.end = (req, res) => {
		if (res.locals.bundle) {
			if (req.body.format === 'js') {
				return res.send(res.locals.bundle);
			} else if (
				req.body.format === 'html' ||
				req.query.format === 'html'
			) {
				return res.render(
					this.templateRoot + '/' + req.templatePath,
					res.locals.bundle
				);
			} else {
				return res
					.status(res.locals.statusCode)
					.json(res.locals.bundle);
			}
		}
		res.send();
	};

	this.post = function () {
		return this.route(routeConfig('post', Array.from(arguments)));
	};

	this.get = function () {
		return this.route(routeConfig('get', Array.from(arguments)));
	};

	this.put = function () {
		return this.route(routeConfig('put', Array.from(arguments)));
	};

	this.delete = function () {
		return this.route(routeConfig('delete', Array.from(arguments)));
	};

	/**
	 * Registra a nova rota. Adiciona todos os metodos (POST, GET, PUT e DELETE)
	 * para o endpoint mapeado
	 * @param {object} app App Express
	 * @param {String} url (optional) Url da rota base do endpoint
	 * @return {object} Gateway Route
	 */
	this.register = (app, url) => {
		const path = `${url || ''}${this.path}`;
		this.routes.forEach(route => {
			app[route.method](`${path}${route.path}`, route.handler);
		});
		return this;
	};

	return this;
}

module.exports = path => new Gateway(path);