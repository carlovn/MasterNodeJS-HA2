/*
 * Create and export configuration variables
 *
 */

// Container object for all the environments
var environments = {};

// Staging (default) environment
environments.staging = {
    'httpPort' : 3000,
    'httpsPort' : 3001,
    'envName' : 'staging',
    'hashingSecret' : 'ThisIsTheHashingSecretForStaging',
    'maxChecks' : 5,
    'twilio' : {
        'accountSid' : '<Twilio Account SID>',
        'authToken' : '<Twilio Auth Token>',
        'fromPhone' : '+15005550006'
    },
    'stripe' : {
        'apikey' : 'sk_test_4eC39HqLyjWDarjtT1zdp7dc:',
        'protocol' : 'https:',
        'hostname' : 'api.stripe.com',
        'method' : 'POST',
        'path' : '/v1/charges'
	},
	'mailgun' : {
		'apikey' : '<Mailgun API Key>'
	}
};

// Production environment
environments.production = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'envName' : 'production',
    'hashingSecret' : 'ThisIsTheHashingSecretForProduction',
    'maxChecks' : 5,
    'twilio' : {
        'accountSid' : '<Twilio Account SID>',
        'authToken' : '<Twilio Auth Token>',
        'fromPhone' : '+15005550006'
    },
    'stripe' : {
        'apikey' : 'sk_test_4eC39HqLyjWDarjtT1zdp7dc:',
        'protocol' : 'https:',
        'hostname' : 'api.stripe.com',
        'method' : 'POST',
        'path' : '/v1/charges'
	},
	'mailgun' : {
		'apikey' : '<Mailgun API Key>'
	}
};

// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that currentEnvironment is actually configured, if not, default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;