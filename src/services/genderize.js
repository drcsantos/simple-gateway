'use strict';
// Documentation: https://genderize.io/
const Gateway = require('./../gateway');
module.exports = Gateway('/genderize')
    .get(`https://api.genderize.io/`, {
        options: {
            circuitBraker: {
                fallback: (error) => {
                    return {
                        name: "fallback",
                        gender: "unknow",
                        probability: 0.0,
                        count: 0
                    };
                }
            }
        }
    })
    .get('/info', `https://api.genderize.io/`, {
        after: (req, res) => {
            const data = res.locals.bundle;
            res.locals.bundle = {
                agent: req.useragent,
                response: data
            }
        },
        options: {
            circuitBraker: {
                fallback: () => ({
                    "name": "fallback",
                    "gender": "unknow",
                    "probability": 0.0,
                    "count": 0
                })
            }
        }
    });