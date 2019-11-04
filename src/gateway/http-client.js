'use strict';

const URL = require('url');
const axios = require('axios');

const errorResponse = (status, statusText, message) => ({
	response: {
		status,
		message,
		statusText
	}
});

function httpClient(options) {
	const url = options.url;
	const client = options.client || 'axios';

	if (!url) {
		throw new Error('`url` parameter is required.');
	}

	switch (client) {
		case 'axios':
			return axios(options);
		case 'node': // return new pending promise
			return new Promise((resolve, reject) => {
				const lib = url.startsWith('https')
					? require('https')
					: require('http');
				const urlData = URL.parse(url, true);
				options = {
					hostname: urlData.hostname,
					port: urlData.port || 80,
					path: urlData.pathname,
					...options,
					method: (options.method || 'get').toUpperCase()
				};
				const request = lib.request(options, response => {
					// handle http errors
					if (
						response.statusCode < 200 ||
						response.statusCode > 299
					) {
						reject(
							errorResponse(
								response.statusCode,
								response.statusText,
								'Failed to load page'
							)
						);
					}
					// temporary data holder
					const body = [];
					response.on('data', chunk => body.push(chunk));
					response.on('end', () => {
						try {
							resolve({
								status: response.statusCode,
								data: Buffer.concat(body).toString()
							});
						} catch (err) {
							reject(
								errorResponse(
									500,
									'Failed to load data',
									err.toString()
								)
							);
						}
					});
				});
				// handle connection errors of the request
				request.on('error', err => {
					reject(
						errorResponse(
							500,
							'Error on request to server',
							err.toString()
						)
					);
				});

				if (options.data) {
					request.write(JSON.stringify(options.data));
				}

				request.end();
			});
		default:
			throw new Error('Unknow http client handler.');
	}
}

module.exports = httpClient;
