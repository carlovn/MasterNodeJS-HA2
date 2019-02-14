/*
 * Helpers for various tasks
 *
 */

// Dependencies
var crypto = require('crypto');
var config = require('./config');
var https = require('https');
var querystring = require('querystring');

// Container for all helpers
var helpers = {};


// Create a SHA256 hash
helpers.hash = function(str){
    if(typeof(str) == 'string' && str.length > 0){
        var hash = crypto.createHmac('sha256',config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

// Parse a JSON string to an object in all cases, without throwing an exception
helpers.parseJsonToObject = function(str){
    try{
        var obj = JSON.parse(str);
        return obj;
    } catch(e) {
        return {};
    }
};

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = function(strLength){
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if(strLength){
        // Define all the possible characters that could go into a string
        var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

        // Start the final string
        var str = '';
        for(i = 1; i <= strLength; i++){
            // Get a random character from the possibleCharacters string
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

            // Append this character to the final string
            str+=randomCharacter;
        }

        // Return the final string
        return str;
        
    } else {
        return false;
    }
};

// Send an SMS message via Twilio
helpers.sendTwilioSms = function(phone,msg,callback){
    // Validate the parameters
    phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
    if(phone && msg){
        // Configure the Twilio request payload
        var payload = {
            'From' : config.twilio.fromPhone,
            'To' : '+1'+phone,
            'Body' : msg
        };

        // Stringify the payload
        var stringPayload = querystring.stringify(payload);

        // Configure the request details
        var requestDetails = {
            'protocol' : 'https:',
            'hostname' : 'api.twilio.com',
            'method' : 'POST',
            'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
            'headers' : {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length' : Buffer.byteLength(stringPayload)
            }
        };

        // Instantiate the request object
        var req = https.request(requestDetails,function(res){
            // Grab the status of the sent request
            var status = res.statusCode;
            // callback successfully if the request went through
            if(status == 200 || status == 201){
                callback(false);
            } else {
                callback('Status code returned was ',status);
            }
        });

        // Bind to the error event so it doesn't get thrown
        req.on('error',function(e){
            callback(e);
        });

        // Add the payload to the request
        req.write(stringPayload);

        // End the request
        req.end();

    } else {
        callback('Given parameters are missing or invalid');
    }
};


// Call the stripe service to charge the user's credit card
helpers.chargeCard = function(cartId, cardNumber, expirationMonth, expirationYear, CVC, zipCode, amount, callback){
    // Validate the parameters
    
    var cartId = typeof(cartId) == 'string' && cartId.trim().length > 0 ? cartId.trim() : false;
    var cardNumber = typeof(cardNumber) == 'string' && cardNumber.trim().length >= 15  &&  helpers.validCards.hasOwnProperty(cardNumber) ? cardNumber.trim() : false;
	var expirationMonth = typeof(expirationMonth) == 'number' && expirationMonth >= 1 && expirationMonth <= 12 ? expirationMonth : false;
	var expirationYear = typeof(expirationYear) == 'number' && expirationYear >= 2019 && expirationYear <= 2021 ? expirationYear : false;
	var CVC = typeof(CVC) == 'number' && CVC >= 100 && CVC <= 9999 ? CVC : false;
	var amount = typeof(amount) == 'number' && amount > 0 ? amount : false;
    var zipCode = typeof(zipCode) == 'string' && zipCode.trim().length > 0 ? zipCode.trim() : false;
    
    if(cartId && cardNumber && expirationMonth && expirationYear && CVC && amount && zipCode){
        // Configure the Stripe request payload
        var payload = {
            'amount' : amount,
            'currency' : 'usd',
            'description' : 'NodeJS Master Pizza Deluxe',
            'metadata' : {'cartId' : cartId},
            'source' : helpers.validCards[cardNumber]
        };
        
        // Stringify the payload
        var stringPayload = querystring.stringify(payload);

        // Configure the request details
        var requestDetails = {
            'protocol' : config.stripe.protocol,
            'hostname' : config.stripe.hostname,
            'method' : config.stripe.method,
            'path' : config.stripe.path,
            'auth' : config.stripe.apikey,
            'data' : stringPayload,
            'headers' : {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length' : Buffer.byteLength(stringPayload)
            }
        };

        // Instantiate the request object
        var req = https.request(requestDetails,function(res){
            // Get the status of the sent request
            var status = res.statusCode;
            // callback success if the request went through
            if(status == 200 || status == 201){

                // Get the success data from the Stripe API response
                res.on('data', function(rdata){
                    // Parse the response success data
                    var data = rdata.toString();
                    callback(status, data);
                });
            } else {

                // Get the error data from the Stripe API response
                res.on('data', function(rdata){
                    // Parse the response error data
                    var data = rdata.toString();
                    // Parse data into a JSON object
                    var dataObject = JSON.parse(data);
                    callback(status, {'Charge Error' : dataObject.error.message});
                });
            }
        });

        // Bind to the error event so it doesn't get thrown
        req.on('error',function(e){
            callback(e);
        });

        // Add the payload to the request
        req.write(stringPayload);

        // End the request
        req.end();

    } else {
        callback('Given parameters are missing or invalid');
    }
};

// Credit cards for testing and getting the corresponding token
helpers.validCards = {
	'4242424242424242' : 'tok_visa',
	'4000056655665556' : 'tok_visa_debit',
	'5555555555554444' : 'tok_mastercard',
	'5200828282828210' : 'tok_mastercard_debit',
    '5105105105105100' : 'tok_mastercard_prepaid',
    '378282246310005' : 'tok_amex'
}


helpers.validateCartItems = function(cartItems,menuItems){
    var cartItemsValid = true;
    cartItems.forEach(function(cartItem){
        var item = typeof(cartItem.cartItem) == 'object' ? cartItem.cartItem : false;
        var id = typeof(cartItem.cartItem.menuId) == 'string' && cartItem.cartItem.menuId.length > 0 && menuItems.items.findIndex(itm => itm.id==cartItem.cartItem.menuId) > -1 ? cartItem.cartItem.menuId : false;
        var itemCount = typeof(cartItem.cartItem.itemCount) == 'number' && cartItem.cartItem.itemCount > 0 ? cartItem.cartItem.itemCount : false;

        if(!item || !id || !itemCount){
            cartItemsValid = false;
        }
    });
    return cartItemsValid;
};


helpers.createCart = function(cartItems,menuItems){
    var cartObject = {};
    var cartTotal = 0.00;

    // Iterate over each array cartItems and enhance it with menuData
    cartItems.forEach(function(item){
        var itemObject = item.cartItem;
        var indx = menuItems.findIndex(itm => itm.id==itemObject.menuId);
        itemObject.itemName = menuItems[indx].name;
        itemObject.itemSize = menuItems[indx].size;
        itemObject.amount = menuItems[indx].price * itemObject.itemCount;
        cartTotal += itemObject.amount;
    });
    cartObject.cartItems = cartItems;
    cartObject.cartTotal = cartTotal;

    return cartObject;
};


// Send email using mailgun
helpers.sendMailgunEmail = function(emailAddress, emailSubject, emailMessage, callback) {
	// Validate parameters
	var emailAddress = typeof(emailAddress) == 'string' && emailAddress.trim().length > 0 && emailRegexp.test(emailAddress.trim()) ? emailAddress.trim() : false;
	var emailSubject = typeof(emailSubject) == 'string' && emailSubject.length > 0 ? emailSubject.trim() : false;
	var emailMessage = typeof(emailMessage) == 'string' && emailMessage.length > 0 ? emailMessage.trim() : false;

	if(emailAddress && emailSubject && emailMessage) {
		// Configure the request payload
		var payload = {
			'from' : "Mailgun Sandbox <postmaster@sandboxsd7896se0f8j5897g24587ghdk.mailgun.org>",
			'to' : "User Name <"+emailAddress+">",
			'subject' : emailSubject,
			'text' : emailMessage
		};

		// Stringify the payload
		var stringPayload = querystring.stringify(payload);

		// Configure the request details
		var requestDetails = {
			'protocol' : 'https:',
			'host': 'api.mailgun.net',
			'method' : 'POST',
			'path' : '/v3/sandboxsd7896se0f8j5897g24587ghdk.mailgun.org/messages',
			'auth' : 'api:'+config.mailgun.apikey,
			'data' : stringPayload,
			'headers' : {
				'Content-type' : 'application/x-www-form-urlencoded',
				'Content-Length' : Buffer.byteLength(stringPayload)
			}
		};

		// Instantiate the request object
		var req = https.request(requestDetails, function(res) {

			// Get the status of the sent request
			var status = res.statusCode;

			// Callback Success if the request went through
			if(status == 200 || status == 201) {
				// Get success response data from mailgun api
				res.on('data', function(rdata) {
					// Parse data into readable format
					var data = rdata.toString();
					// Parse data string into JSON object
					var dataObject = JSON.parse(data);

					callback(status, {"message" : dataObject.message})
				});
			} else {
				res.on('data', function(rdata) {
					// Parse data into readable format
					var data = rdata.toString();
					// Parse data string into JSON object
					var dataObject = JSON.parse(data);
					
					callback(status, {"message" : dataObject.message})
				});
			}
		});

		// Bind to the error event so it doesn't get thrown
		req.on('error', function(e) {
			callback(e);
		});

		// Add the payload
		req.write(stringPayload);

		// End the request
		req.end();
	} else {
		callback(403, {'Error' : 'Given parameters were missing or invalid'});
	}
};


// Export the module
module.exports = helpers;