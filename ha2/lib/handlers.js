/*
 * Request Handlers
 *
 */


// Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');
const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Define the handlers
var handlers = {};

// Users
handlers.users = function(data,callback){
    var acceptableMethods = ['get','post','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data,callback);
    } else {
        callback(405);
    }
};

// _users is an object which defines the private methods (submethods) being used by the handlers.users handler

// Container (object) for the users submethods
handlers._users = {};

// _users - post
// Required data: emailAddress, firstName, lastName, phone, addressLine1, addressCity, addressState, addressZipCode, phone, password, tosAgreement
// Optional data: addressLine2, cardNbr, cardExp, cardCVV
handlers._users.post = function(data,callback){
    // Check that all the required fields are filled out
    var emailAddress = typeof(data.payload.emailAddress) == 'string' && data.payload.emailAddress.trim().length > 0 && emailRegexp.test(data.payload.emailAddress.trim()) ? data.payload.emailAddress.trim() : false;
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var addressLine1 = typeof(data.payload.addressLine1) == 'string' && data.payload.addressLine1.trim().length > 0 ? data.payload.addressLine1.trim() : false;
    var addressLine2 = typeof(data.payload.addressLine2) == 'string' && data.payload.addressLine2.trim().length > 0 ? data.payload.addressLine2.trim() : '';
    var addressCity = typeof(data.payload.addressCity) == 'string' && data.payload.addressCity.trim().length > 0 ? data.payload.addressCity.trim() : false;
    var addressState = typeof(data.payload.addressState) == 'string' && data.payload.addressState.trim().length == 2 ? data.payload.addressState.trim() : false;
    var addressZipCode = typeof(data.payload.addressZipCode) == 'number' && data.payload.addressZipCode % 1 === 0 ? data.payload.addressZipCode : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;
    var cardNbr = typeof(data.payload.cardNbr) == 'string' && data.payload.cardNbr.trim().length == 16 ? data.payload.cardNbr.trim() : '';
    var cardExp = typeof(data.payload.cardExp) == 'string' && data.payload.cardExp.trim().length <= 5 ? data.payload.cardExp.trim() : '';
    var cardCVV = typeof(data.payload.cardCVV) == 'string' && data.payload.cardExp.trim().length <= 4 ? data.payload.cardCVV.trim() : '';

    if(emailAddress && firstName && lastName && phone && addressLine1 && addressCity && addressState && addressZipCode && password && tosAgreement){
        // Make sure that the user doesn't already exist
        _data.read('users',phone,function(err,data){
            if(err){
                // Hash the password
                var hashedPassword = helpers.hash(password);
                
                // Create the user object 
                if(hashedPassword){
                    var userObject = {
                        'emailAddress' : emailAddress,
                        'firstName' : firstName,
                        'lastName' : lastName,
                        'phone' : phone,
                        'addressLine1' : addressLine1,
                        'addressLine2' : addressLine2,
                        'addressCity' : addressCity,
                        'addressState' : addressState,
                        'addressZipCode' : addressZipCode,
                        'hashedPassword' : hashedPassword,
                        'tosAgreement' : true,
                        'cardNbr' : cardNbr,
                        'cardExp' : cardExp,
                        'cardCVV' : cardCVV,
                        'cartItemCnt' : 0
                    };

                    // Store the user
                    _data.create('users',phone,userObject,function(err){
                        if(!err){
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500,{'Error' : 'Could not create the new user'});
                        }
                    });
                } else {
                    callback(500,{'Error' : 'Could not hash the password'});
                }
            } else {
                callback(400,{'Error' : 'A user with that phone number already exists'});
            }
        });
    } else {
        callback(400,{'Error' : 'User : Missing required fields'});
    }
};

// _users - get
// Required data: phone
// Optional data: none
handlers._users.get = function(data,callback){
    // Check that the phone number is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){

        // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
            if(tokenIsValid){
                // Lookup the user
                _data.read('users',phone,function(err,data){
                    if(!err && data){
                        // Remove the hashed password from the user object before returning it to the requestor
                        delete data.hashedPassword;
                        callback(200,data);
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(403,{'Error' : 'Missing required token in header, or token is invalid'});
            }
        });

    } else {
        callback(400,{'Error' : 'Missing required phone number'});
    }
};

// _users - put
// Required data: phone
// Optional data: emailAddress, firstName, lastName, addressLine1, addressLine2, addressCity, addressState, addressZipCode, password, cardNbr, cardExp, cardCVV, cartItemCnt (at least one of these must be provided)
handlers._users.put = function(data,callback){
    // Check for the required field
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

    // Check for the optional fields
    var emailAddress = typeof(data.payload.emailAddress) == 'string' && data.payload.emailAddress.trim().length > 0 && emailRegexp.test(data.payload.emailAddress.trim()) ? data.payload.emailAddress.trim() : false;
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var addressLine1 = typeof(data.payload.addressLine1) == 'string' && data.payload.addressLine1.trim().length > 0 ? data.payload.addressLine1.trim() : false;
    var addressLine2 = typeof(data.payload.addressLine2) == 'string' && data.payload.addressLine2.trim().length > 0 ? data.payload.addressLine2.trim() : false;
    var addressCity = typeof(data.payload.addressCity) == 'string' && data.payload.addressCity.trim().length > 0 ? data.payload.addressCity.trim() : false;
    var addressState = typeof(data.payload.addressState) == 'string' && data.payload.addressState.trim().length == 2 ? data.payload.addressState.trim() : false;
    var addressZipCode = typeof(data.payload.addressZipCode) == 'number' && data.payload.addressZipCode % 1 === 0 ? data.payload.addressZipCode : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var cardNbr = typeof(data.payload.cardNbr) == 'string' && data.payload.cardNbr.trim().length == 16 ? data.payload.cardNbr.trim() : false;
    var cardExp = typeof(data.payload.cardExp) == 'string' && data.payload.cardExp.trim().length <= 5 ? data.payload.cardExp.trim() : false;
    var cardCVV = typeof(data.payload.cardCVV) == 'string' && data.payload.cardExp.trim().length <= 4 ? data.payload.cardCVV.trim() : false;
    var cartItemCnt = typeof(data.payload.cartItemCnt) == 'number' && data.payload.cartItemCnt % 1 === 0 ? data.payload.cartItemCnt : false;


    // Error if the phone is invalid
    if(phone){
        // Error if all of the optional fields are missing
        if(emailAddress || firstName || lastName || addressLine1 || addressLine2 || addressCity || addressState || addressZipCode || password || cardNbr || cardExp || cardCVV || cartItemCnt){
            // Get the token from the headers
            var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
                if(tokenIsValid){
                    // Lookup the user
                    _data.read('users',phone,function(err,userData){
                        if(!err && userData){
                            // Update the fields that are necessary
                            if(emailAddress){
                                userData.emailAddress = emailAddress;
                            }
                            if(firstName){
                                userData.firstName = firstName;
                            }
                            if(lastName){
                                userData.lastName = lastName;
                            }
                            if(addressLine1){
                                userData.addressLine1 = addressLine1;
                            }
                            if(addressLine2){
                                userData.addressLine2 = addressLine2;
                            }
                            if(addressCity){
                                userData.addressCity = addressCity;
                            }
                            if(addressState){
                                userData.addressState = addressState;
                            }
                            if(addressZipCode){
                                userData.addressZipCode = addressZipCode;
                            }
                            if(password){
                                hashedPassword = helpers.hash(password);
                                if(hashedPassword){
                                    userData.hashedPassword = hashedPassword;
                                } else {
                                    console.log('Error while hashing password. Kept the original password');
                                }
                            }
                            if(cardNbr){
                                userData.cardNbr = cardNbr;
                            }
                            if(cardExp){
                                userData.cardExp = cardExp;
                            }
                            if(cardCVV){
                                userData.cardCVV = cardCVV;
                            }
                            if(cartItemCnt){
                                userData.cartItemCnt = cartItemCnt;
                            }
                            // Store the new updates
                            _data.update('users',phone,userData,function(err){
                                if(!err){
                                    callback(200);
                                } else {
                                    console.log(err);
                                    callback(500,{'Error' : 'Could not update the user'});
                                }
                            });
                        } else {
                            callback(400,{'Error' : 'The specified user does not exist'});
                        }
                    });
                } else {
                    callback(403,{'Error' : 'Missing required token in header, or token is invalid'});
                }
            });
            
        } else {
            callback(400,{'Error' : 'Missing fields to update'});
        }
    } else {
        callback(400,{'Error' : 'Missing required phone number'});
    }
};

// _users - delete
// Required data: phone
handlers._users.delete = function(data,callback){
    // Check that the phone number is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){
        // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
            if(tokenIsValid){
                // Lookup the user
                _data.read('users',phone,function(err,userData){
                    if(!err && userData){
                        _data.delete('users',phone,function(err){
                            if(!err){
                                // Delete each of the checks associated with the user
                                var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                var checksToDelete = userChecks.length;
                                if(checksToDelete > 0){
                                    var checksDeleted = 0;
                                    var deletionErrors = false;
                                    // Loop through the checks list and delete each check
                                    userChecks.forEach(function(checkId){
                                        // Delete the check
                                        _data.delete('checks',checkId,function(err){
                                            if(err){
                                                deletionErrors = true;
                                            }
                                            checksDeleted++;
                                        });                                    
                                    });
                                    if(checksDeleted = checksToDelete){
                                        if(!deletionErrors){
                                            callback(200);
                                        } else {
                                            callback(500,{'Error' : 'Errors encountered while attempting to delete all of the user\'s checks. All checks may not have been deleted from the system successfully'});
                                        }
                                    } else {
                                        callback(500,{'Error' : 'Something went wrong during the deletion of all checks for a user deletion'});
                                    }
                                } else {
                                    callback(200);
                                }
                            } else {
                                callback(500,{'Error' : 'Could not delete the specified user'});
                            }
                        });
                    } else {
                        callback(400,{'Error' : 'Could not find the specified user'});
                    }
                });
            } else {
                callback(403,{'Error' : 'Missing required token in header, or token is invalid'});
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required phone number'});
    }
};

// Tokens
handlers.tokens = function(data,callback){
    var acceptableMethods = ['get','post','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data,callback);
    } else {
        callback(405);
    }
};

// _tokens is an object which defines the private methods (submethods) being used by the handlers.tokens handler

// Container (object) for the tokens submethods
handlers._tokens = {};

// _tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function(data,callback){
    // Check that all the required fields are filled out
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    if(phone && password){
        // Lookup the user who matches that phone number
        _data.read('users',phone,function(err,userData){
            if(!err && userData){
                // Hash the sent password and compare it to the stored password in the user object
                var hashedPassword = helpers.hash(password);
                if(hashedPassword){
                    if(hashedPassword == userData.hashedPassword){
                        // If valid, create a new token with a random name. Set expiration date & time 1 hour in the future
                        var tokenId = helpers.createRandomString(20);
                        var expires = Date.now() + 1000 * 60 * 60;
                        var tokenObject = {
                            'phone' : phone,
                            'id' : tokenId,
                            'expires' : expires
                        };

                        // Store the token
                        _data.create('tokens',tokenId,tokenObject,function(err){
                            if(!err){
                                callback(200,tokenObject);
                            } else {
                                callback(500,{'Error' : 'Could not create the new token'});
                            }
                        });
                    } else {
                        callback(400,{'Error' : 'Password does not match the password on file'});
                    }
                } else {
                    console.log('Could not hash the sent password');
                    callback(500,{'Error' : 'Could not hash the password'});
                }
            } else {
                callback(400,{'Error' : 'Could not find the specified user'});
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required field(s)'});
    }

};

// _tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function(data,callback){
    // Check that the id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        // Lookup the token
        _data.read('tokens',id,function(err,tokenData){
            if(!err && tokenData){
                callback(200,tokenData);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required phone number'});
    }
};

// _tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function(data,callback){
    // Validate the required fields
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if(id && extend){
        // Lookup the token
        _data.read('tokens',id,function(err,tokenData){
            if(!err && tokenData){
                // Check to make sure the token isn't already expired
                if(tokenData.expires > Date.now()){
                    // set the expiration to an hour from now
                    var expires = Date.now() + 1000 * 60 * 60;
                    tokenData.expires = expires;
                    // Store the new updates
                    _data.update('tokens',id,tokenData,function(err){
                        if(!err){
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500,{'Error' : 'Could not update the token\'s expiration'});
                        }
                    });
                } else {
                    callback(400,{'Error' : 'The token has already expired and cannot be extended'});
                }
            } else {
                callback(400,{'Error' : 'The specified token does not exist'});
            }
        });        
    } else {
        callback(400,{'Error' : 'Missing required field(s) or field(s) are invalid'});
    }
};

// _tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data,callback){
    // Check that the id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        // Lookup the token
        _data.read('tokens',id,function(err,tokenData){
            if(!err && tokenData){
                _data.delete('tokens',id,function(err){
                    if(!err){
                        callback(200);
                    } else {
                        callback(500,{'Error' : 'Could not delete the specified token'});
                    }
                });
            } else {
                callback(400,{'Error' : 'Could not find the specified token'});
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required token id'});
    }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id,phone,callback){
    //Lookup the token
    _data.read('tokens',id,function(err,tokenData){
        if(!err && tokenData){
            // Check that the token is for the given user and that the token has not expired
            if(tokenData.phone == phone && tokenData.expires > Date.now()){
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};


// menu
handlers.menu = function(data,callback){
    var acceptableMethods = ['get'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._menu[data.method](data,callback);
    } else {
        callback(405);
    }
};

// _menu is an object which defines the private methods (submethods) being used by the handlers.menu handler

// Container (object) for the menu submethods
handlers._menu = {};

// Menu - get
// Required data: userPhone
// Optional data: none
handlers._menu.get = function(data,callback){
    // Check that the userPhone is valid
    var userPhone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    
    if(userPhone){
        // Lookup the menu
        _data.read('menu','menu_items',function(err,menuData){
            if(!err && menuData){
                
                // Get the token from the headers
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                // Verify that the given token is valid and belongs to the user who made the menu request
                handlers._tokens.verifyToken(token,userPhone,function(tokenIsValid){
                    if(tokenIsValid){
                        // Return the menu data
                        callback(200,menuData);
                    } else {
                        callback(403);
                    }   
                });
            } else {
                callback(404);
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required phone number'});
    }
};


// Cart
handlers.cart = function(data,callback){
    var acceptableMethods = ['get','post','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._cart[data.method](data,callback);
    } else {
        callback(405);
    }
};

// _cart is an object which defines the private methods (submethods) being used by the handlers.cart handler

// Container (object) for the menu submethods
handlers._cart = {};

// _cart - post
// This method can only be used to create the intial cart. It cannot be used to add additional menu items (use the put method)
// Required data: cartItems : [ cartItem : { menuId, itemCount } ]
// Optional data: none
handlers._cart.post = function(data,callback){
    
    // Read the available menuItems. This will be passed to the validateCartItems helper function to validate that the cart Items exist in the menu
    _data.read('menu','menu_items',function(err,menuData){
        if(!err && menuData){
            
            // Validate inputs
            var cartItems = typeof(data.payload.cartItems) == 'object' && data.payload.cartItems instanceof Array && data.payload.cartItems.length > 0 && helpers.validateCartItems(data.payload.cartItems,menuData) ? data.payload.cartItems : false;
            if(cartItems){
                
                // Get the token from the headers
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                
                // Get the user's phone number from the token file
                _data.read('tokens',token,function(err,tokenData){
                    if(!err && tokenData){
                        var userPhone = tokenData.phone;

                        // Verify that the token is valid
                        handlers._tokens.verifyToken(token,userPhone,function(tokenIsValid){
                            if(tokenIsValid){
                                // Lookup the user by using the phone from tokenData
                                _data.read('users',userPhone,function(err,userData){
                                    if(!err && userData){
                                        // Check to see if the user already has a cart
                                        var userCartId = typeof(userData.cartId) == 'string' && userData.cartId.length > 0 ? userData.cartId : false;
                                
                                        // If the user does not have a cartId, create it and add the items to the cart
                                        if(!userCartId){
                                            // Create a random ID for the cart
                                            var cartId = helpers.createRandomString(20);
        
                                            // Create the cart object, and include the user's phone
                                            var cartObject = {
                                                'id' : cartId,
                                                'userPhone' : userPhone,
                                                'cartItems' : cartItems
                                            };
        
                                            // Save the object (cart)
                                            _data.create('cart',cartId,cartObject,function(err){
                                                if(!err){
                                                    // Add the cart id to the user's object
                                                    userData.cartId = cartId;
        
                                                    // Save the new user data
                                                    _data.update('users',userPhone,userData,function(err){
                                                        if(!err){
                                                            // Return the data about the new cart
                                                            callback(200,cartObject);
                                                        } else {
                                                            callback(500,{'Error' : 'Could not update the user with the new cart'});
                                                        }
                                                    });
                                                } else {
                                                    callback(500,{'Error' : 'Could not create the new cart'});
                                                }
                                            });
                                        } else {
                                            callback(400,{'Error' : 'The user already has an existing cart'});
                                        }
                                    } else {
                                        callback(403,{'Error' : 'User error'});
                                    }
                                });
                            } else {
                                callback(403,{'Error' : 'Token is invalid'});
                            }
                        });
                    } else {
                        callback(403,{'Error' : 'Token error'});
                    }
                });
            } else {
                callback(400,{'Error' : 'Missing or invalid required field(s)'});
            }
        } else {
            callback(404,{'Error' : 'Could not find the menu items to validate cartItems'});
        }
    });   
};

// Cart - get
// Required data: userPhone
// Optional data: none
handlers._cart.get = function(data,callback){
    // Check that the userPhone is valid
    var userPhone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    
    if(userPhone){
        // Lookup the menu
        _data.read('menu','menu_items',function(err,menuData){
            if(!err && menuData){
                var menuList = typeof(menuData.items) == 'object' && menuData.items instanceof Array && menuData.items.length > 0 ? menuData.items : false;
                
                // Get the token from the headers
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                // Verify that the given token is valid and belongs to the user who made the menu request
                handlers._tokens.verifyToken(token,userPhone,function(tokenIsValid){
                    if(tokenIsValid){
                        // Lookup the user by using the phone from the query string
                        _data.read('users',userPhone,function(err,userData){
                            if(!err && userData){
                                // Check to see if the user already has a cartId or not
                                var userCartId = typeof(userData.cartId) == 'string' && userData.cartId.length > 0 ? userData.cartId : false;

                                if(userCartId){
                                    // Get the cart data from the cart file
                                    _data.read('cart',userCartId,function(err,cartData){
                                        if(!err && cartData){
                                            // cartItems is an array of cartItem objects
                                            var cartItems = typeof(cartData.cartItems) == 'object' && cartData.cartItems instanceof Array && cartData.cartItems.length > 0 ? cartData.cartItems : false;
                                            if(cartItems){

                                                // Create the cart object
                                                var cartObject = {};
                                                cartObject = helpers.createCart(cartItems,menuList);
                                                
                                                cartData.cartItems = cartObject.cartItems;
                                                cartData.cartTotal = cartObject.cartTotal;
                                                callback(200,cartData);
                                            } else {
                                                callback(404, {'Error' : 'Invalid items in cart'});    
                                            }
                                        } else {
                                            callback(404);
                                        }
                                    });
                                } else {
                                    callback(400,{'Error' : 'The user does not have a cart yet'});
                                }
                            } else {
                                callback(403,{'Error' : 'User error'});
                            }
                        });
                    } else {
                        callback(403);
                    }   
                });
            } else {
                callback(404);
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required phone number'});
    }
};


// Cart - put
// This method can be used to add items to the cart or change the number of items of an existing menu item. It cannot be used to remove a menu item
// Required data: cartItems : [ cartItem : { menuId, itemCount } ]
// Optional data: none
handlers._cart.put = function(data,callback){

    // Read the available menuItems. This will be passed to the validateCartItems helper function to validate that the cart Items exist in the menu

    _data.read('menu','menu_items',function(err,menuData){
        if(!err && menuData){
            // Validate inputs
            var cartItems = typeof(data.payload.cartItems) == 'object' && data.payload.cartItems instanceof Array && data.payload.cartItems.length > 0 && helpers.validateCartItems(data.payload.cartItems,menuData) ? data.payload.cartItems : false;
            if(cartItems){
                // Get the token from the headers
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                // Lookup the user by reading the token first
                _data.read('tokens',token,function(err,tokenData){
                    if(!err && tokenData){
                        var userPhone = tokenData.phone;

                        // Verify that the token is valid
                        handlers._tokens.verifyToken(token,userPhone,function(tokenIsValid){
                            if(tokenIsValid){
                        
                                // Lookup the user by using the phone from tokenData
                                _data.read('users',userPhone,function(err,userData){
                                    if(!err && userData){
                                        // Check to see if the user already has a cart
                                        var userCartId = typeof(userData.cartId) == 'string' && userData.cartId.length > 0 ? userData.cartId : false;
                                        
                                        // Read the user's cart if it exists
                                        if(userCartId){
                                            
                                            // Read the user's cart
                                            _data.read('cart',userCartId,function(err,cartData){
                                                if(!err && cartData){
                                            
                                                    // Iterate over the payload data and update existing cart items or add new ones
                                                    var userCartItems = cartData.cartItems;  // This is an array object

                                                    cartItems.forEach(function(item){
                                                        // Set the index if this is an existing item
                                                        var cartItem = item.cartItem;
                                                        var indx = userCartItems.findIndex(itm => itm.cartItem.menuId==cartItem.menuId);
                                                        // If it exists, update it
                                                        if(indx > -1){
                                                            userCartItems[indx].cartItem.itemCount = cartItem.itemCount;
                                                        } else {
                                                            // Add it
                                                            userCartItems.push(item);
                                                        }
                                                    });
                                                    // cartData.cartItems = userCartItems;
        
                                                    // Save the updated cart data
                                                    _data.update('cart',userCartId,cartData,function(err){
                                                        if(!err){
                                                            // Return the data about the new cart
                                                            callback(200,cartData);
                                                        } else {
                                                            callback(500,{'Error' : 'Could not update the user cart'});
                                                        }
                                                    });
                                                } else {
                                                    callback(500,{'Error' : 'Could not read the user cart'});
                                                }
                                            });
                                        } else {
                                            callback(400,{'Error' : 'The user does not have a cart yet'});
                                        }
                                    } else {
                                        callback(403,{'Error' : 'User error'});
                                    }
                                });
                            } else {
                                callback(403,{'Error' : 'Token is invalid'});
                            }
                        });
                    } else {
                        callback(403,{'Error' : 'Token error'});
                    }
                });
                
            } else {
                callback(400,{'Error' : 'Missing or invalid required field(s)'});
            }
        } else {
            callback(404,{'Error' : 'Could not find the menu items to validate cartItems'});
        }
    });   
};


// Cart - delete
// This method is used to delete one or more cartItems. Any items passed to this method for deletion, which do not exist in the cart, will simply be ignored
// Required data: cartItems : [ cartItem : { menuId, itemCount } ]
// Optional data: none
handlers._cart.delete = function(data,callback){
    
    // Read the available menuItems. This will be passed to the validateCartItems helper function to validate that the cart Items exist in the menu
    _data.read('menu','menu_items',function(err,menuData){
        if(!err && menuData){

            // Validate inputs
            var cartItems = typeof(data.payload.cartItems) == 'object' && data.payload.cartItems instanceof Array && data.payload.cartItems.length > 0 && helpers.validateCartItems(data.payload.cartItems,menuData) ? data.payload.cartItems : false;
            if(cartItems){

                // Get the token from the headers
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

                // Lookup the user by reading the token first
                _data.read('tokens',token,function(err,tokenData){
                    if(!err && tokenData){
                        var userPhone = tokenData.phone;

                        // Verify that the token is valid
                        handlers._tokens.verifyToken(token,userPhone,function(tokenIsValid){
                            if(tokenIsValid){
                                // Lookup the user by using the phone from tokenData
                                _data.read('users',userPhone,function(err,userData){
                                    if(!err && userData){
                                        // Check to see if the user already has a cart
                                        var userCartId = typeof(userData.cartId) == 'string' && userData.cartId.length > 0 ? userData.cartId : false;
                                
                                        // Read the user's cart if it exists
                                        if(userCartId){
                                            
                                            // Read the user's cart
                                            _data.read('cart',userCartId,function(err,cartData){
                                                if(!err && cartData){
                                            
                                                    var userCartItems = cartData.cartItems;  // This is an array object
                                            
                                                    // Iterate over the payload data and delete existing, matching cart items
                                                    cartItems.forEach(function(item){
                                                        // Set the index if this is an existing item
                                                        var cartItem = item.cartItem;
                                                        var indx = userCartItems.findIndex(itm => itm.cartItem.menuId==cartItem.menuId);
                                                        // If it exists, delete it
                                                        if(indx > -1){
                                                            userCartItems.splice(indx,1);
                                                        }
                                                    });
        
                                                    // Save the updated cart data
                                                    _data.update('cart',userCartId,cartData,function(err){
                                                        if(!err){
                                                            // Return the data about the new cart
                                                            callback(200,cartData);
                                                        } else {
                                                            callback(500,{'Error' : 'Could not update the user cart'});
                                                        }
                                                    });
                                                } else {
                                                    callback(500,{'Error' : 'Could not read the user cart'});
                                                }
                                            });
                                        } else {
                                            callback(400,{'Error' : 'The user does not have a cart yet'});
                                        }
                                    } else {
                                        callback(403,{'Error' : 'User error'});
                                    }
                                });
                            } else {
                                callback(403,{'Error' : 'Token is invalid'});
                            }
                        });
                    } else {
                        callback(403,{'Error' : 'Token error'});
                    }
                });
                
            } else {
                callback(400,{'Error' : 'Missing or invalid required field(s)'});
            }
        } else {
            callback(404,{'Error' : 'Could not find the menu items to validate cartItems'});
        }
    });   
};


// Checkout
handlers.checkout = function(data,callback){
    var acceptableMethods = ['post'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._checkout[data.method](data,callback);
    } else {
        callback(405);
    }
};

// _checkout is an object which defines the private methods (submethods) being used by the handlers.checkout handler

// Container (object) for the menu submethods
handlers._checkout = {};

// _checkout - post
// This method is used to make the payment for the pizza purchase and will empty the cart when successful
// Required data: cartId, cardNumber, expirationMonth, expirationYear, CVC
// Optional data: none
handlers._checkout.post = function(data,callback){

    var cartId = typeof(data.payload.cartId) == 'string' && data.payload.cartId.trim().length > 0 ? data.payload.cartId.trim() : false;
    var cardNumber = typeof(data.payload.cardNumber) == 'string' && data.payload.cardNumber.trim().length >= 15  &&  helpers.validCards.hasOwnProperty(data.payload.cardNumber) ? data.payload.cardNumber.trim() : false;
	var expirationMonth = typeof(data.payload.expirationMonth) == 'number' && data.payload.expirationMonth >= 1 && data.payload.expirationMonth <= 12 ? data.payload.expirationMonth : false;
	var expirationYear = typeof(data.payload.expirationYear) == 'number' && data.payload.expirationYear >= 2019 && data.payload.expirationYear <= 2021 ? data.payload.expirationYear : false;
	var CVC = typeof(data.payload.CVC) == 'number' && data.payload.CVC >= 100 && data.payload.CVC <= 9999 ? data.payload.CVC : false;

    if (cartId && cardNumber && expirationMonth && expirationYear && CVC) {
        
        // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Read the user's token file
        _data.read('tokens',token,function(err,tokenData){
            if(!err && tokenData){
                var userPhone = tokenData.phone;

                // Verify that the token is valid
                handlers._tokens.verifyToken(token,userPhone,function(tokenIsValid){
                    if(tokenIsValid){

                        // Lookup the user by using the phone from tokenData
                        _data.read('users',userPhone,function(err,userData){
                            if(!err && userData){
                                // Check to see if the user already has a cart
                                var userCartId = typeof(userData.cartId) == 'string' && userData.cartId.length > 0 ? userData.cartId : false;
                        
                                // Read the user's cart if it exists and it is equal to the cartId in the payload
                                if(userCartId && userCartId == cartId){
                                    
                                    // Read the user's cart
                                    _data.read('cart',userCartId,function(err,cartData){
                                        if(!err && cartData){
                                            var userCartItems = cartData.cartItems;  // This is an array object
                
                                            // Check that the cart is not empty
                                            var itemCount = userCartItems.length;

                                            if(itemCount > 0) {

                                                // Read the menu
                                                _data.read('menu','menu_items',function(err,menuData){
                                                    if(!err && menuData){

                                                        // Create the cart object
                                                        var cartObject = {};
                                                        cartObject = helpers.createCart(userCartItems,menuData.items);

                                                        // proceed to checkout                            

                                                        // Stripe payment API
                                                        helpers.chargeCard(cartId, cardNumber, expirationMonth, expirationYear, CVC, userData.addressZipCode, cartObject.cartTotal, function(status, message) {
                                                            // Check for transaction is successful
                                                            if(status == 200 || status == 201) {
                                                                
                                                                // Parse message string into JSON
                                                                var messageObject = JSON.parse(message);

                                                                // get user email
                                                                var emailAddress = userData.emailAddress;

                                                                // email subject
                                                                var emailSubject = "Pizza order receipt";

                                                                // order receipt
                                                                var orderStatus = messageObject.status;
                                                                var paymentMethod = messageObject.source.brand;
                                                                var orderDate = Date.now();
                                                                var totalAmount = messageObject.amount;

                                                                // Generate order receipt
                                                                var receipt = "Order Status: "+orderStatus+"\nPayment Method: "+paymentMethod+"\nOrder Date: "+orderDate+"\nTotal Amount: "+totalAmount;

                                                                // Send email to user
                                                                helpers.sendMailgunEmail(emailAddress, emailSubject, receipt, function(status, message) {
                                                                    if(status == 200 || status == 201) {
                                                                
                                                                        // Empty the cart
                                                                        cartData.cartItems = [];

                                                                        _data.update('cart', cartId, cartData, function(err) {
                                                                            if (!err) {
                                                                                // Send email to user
                                                                                callback(status, message);
                                                                            } else {
                                                                                callback(500, {'Error': 'Could not empty cart'});
                                                                            }
                                                                        });
                                                                    } else {
                                                                        callback(status, message);
                                                                    }
                                                                });                                    
                                                            } else {
                                                                callback(status, message);
                                                            }                           
                                                        });
                                                    } else {
                                                        callback(500, {'Error' : 'Could not read the menu data'});
                                                    }
                                                });
                                            } else {
                                                callback(403, {'Error' : 'Cart is empty'});
                                            }
                                        } else {
                                            callback(500, {'Error' : 'Could not read cart items'});
                                        }
                                    });                
                                } else {
                                    callback(403, {'Error': 'Invalid cartId'});
                                }
                            } else {
                                callback(500, {'Error': 'Could not read the user data'});
                            }
                        });
                    } else {    
                        callback(403,{'Error' : 'Token is invalid'});
                    }
                });
            } else {
                callback(403,{'Error' : 'Could not read the token data'});
            }
        });
    } else {
        callback(400, {'Checkout Error': 'Missing or invalid required fields'});
    }
};


// Ping Handler
handlers.ping = function(data,callback){
    callback(200);
};

// Not Found handler
handlers.notFound = function(data,callback){
    //Callback a http status code
    callback(404);
};


// Export the module
module.exports = handlers;
