'use strict';

const Gateway = require('./../gateway');

module.exports = Gateway('/cep/:cep').get(`https://viacep.com.br/ws/:cep/json`, {
    after: (req, res) => {
		const data = res.locals.bundle;

		res.locals.bundle = {
			address: data.logradouro,
			addressComplement: data.complemento,
            addressNumber: '',
            neighborHood: data.bairro,
			city: data.localidade,
			federationUnit: data.uf,
			postalAreaCode: data.cep
		};
	}
});