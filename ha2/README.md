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
Body: '''
  {'emailAddress' : 'john.smith@email.com'}
  '''
