# The NodeJS Master Class - Homework Assignment 2

> This project contains the following hidden folders and files:
- .data - Contains folders cart, menu, tokens & users. menu contains menu_items.json as an example.
- https - Contains the .rnd file used for creating the certificate and key. You will need to create your own certificate and key in order to use the https protocol.

## Code Overview
This application exposes the following routes on either HTTP or HTTPS:
- users (POST, GET, PUT, DELETE)
- tokens (POST, GET, PUT, DELETE)
- menu (GET)
- cart (POST, GET, PUT, DELETE)
- checkout (POST)

### Typical Application Flow
- Create a new user (users POST)
- Create a new token for this user (token POST)
- Get the list of available items on the menu (menu GET)
- Create the cart (put the first item in the cart) (cart POST)
- Add, update or remove items in the cart (cart PUT, DELETE)
- Check out and pay (checkout POST)

### users - POST
Request: http(s)://<host>/users

Headers: None

Body: 
```
  {'emailAddress' : 'john.smith@email.com', 'firstName' : 'John', 'lastName' : 'Smith', 'phone' : '5555555555', 'addressLine1' : '1 First Street', 'addressLine2' : '#111', 'addressCity' : 'Capital City', 'addressState' : 'NY', 'addressZipCode' : 99999, 'password' : 'mypassword', 'tosAgreement' : true/false, 'cardNbr' : '294857275638746', 'cardExp' : '1219', 'cardCVV' : '9999'}
```

### users - GET
Request: http(s)://<host>/users?phone=5555555555

Headers: Token

Body: None



### users - PUT
Request: http(s)://<host>/users

Headers: Token

Body:
```
  {'emailAddress' : 'john.smith@email.com', 'firstName' : 'John', 'lastName' : 'Smith', 'phone' : '5555555555', 'addressLine1' : '1 First Street', 'addressLine2' : '#111', 'addressCity' : 'Capital City', 'addressState' : 'NY', 'addressZipCode' : 99999, 'password' : 'mypassword', 'cardNbr' : '294857275638746', 'cardExp' : '1219', 'cardCVV' : '9999', 'cartItemCnt' : 1}
```

The only required element is 'phone'. Everything else is optional. Phone number cannot be changed.



### users - DELETE
Request: http(s)://<host>/users?phone=5555555555

Headers: Token

Body: None



### tokens - POST
Request: http(s)://<host>/tokens

Headers: None

Body: 
```
  {'phone' : '5555555555', 'password' : 'mypassword'}
```

Both phone and password are required for this method.



### tokens - GET
Request: http(s)://<host>/tokens?id=ksjnf405789ty894r7ug

Headers: None

Body: None



### tokens - PUT
Request: http(s)://<host>/tokens

Headers: None

Body:
```
  {'id' : 'sd976sdfj94578th9345', 'extend' : true/false}
```

This method can be used to extend a token which is still valid.
