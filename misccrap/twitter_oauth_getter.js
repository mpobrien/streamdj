#!/usr/bin/env node
var sys = require('sys')

var argv = require('optimist')
  .usage('Usage: --key=[consumer key] -secret=[consumer secret]')
  .demand(['key', 'secret'])
  .argv
;

var OAuth = require('node-oauth').OAuth;
//var Step = require('step');
//var colors = require('colors');

var REQUEST_TOKEN_URL = 'http://api.twitter.com/oauth/request_token';
var ACCESS_TOKEN_URL = 'http://api.twitter.com/oauth/access_token';
var OAUTH_VERSION = '1.0';
var HASH_VERSION = 'HMAC-SHA1';


function getAccessToken(oa, oauth_token, oauth_token_secret, pin) {
  oa.getOAuthAccessToken(oauth_token, oauth_token_secret, pin,
    function(error, oauth_access_token, oauth_access_token_secret, results2) {
      if (error) {
        if (parseInt(error.statusCode) == 401) {
          throw new Error('The pin number you have entered is incorrect');
        }
      }
      console.log('Your OAuth Access Token: ' + (oauth_access_token));
      console.log('Your OAuth Token Secret: ' + (oauth_access_token_secret));

      oa.getProtectedResource("http://api.twitter.com/1/account/verify_credentials.json", "GET", oauth_access_token, oauth_access_token_secret,  function (error, data, response) {
          sys.puts(data);
          process.exit(1);
      });
    });
}

function getRequestToken(oa) {
  
  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
    if(error) {
      throw new Error(([error.statusCode, error.data].join(': ')));
    } else { 
      console.log('In your browser, log in to your twitter account.  Then visit:')
      console.log(('https://twitter.com/oauth/authorize?oauth_token=' + oauth_token))
      console.log('After logged in, you will be promoted with a pin number')
      console.log('Enter the pin number here:');
      var stdin = process.openStdin();
      stdin.on('data', function(chunk) {
        pin = chunk.toString().trim();
        getAccessToken(oa, oauth_token, oauth_token_secret, pin);
      });
    }
  });
}
    

var key = argv.key.trim();
var secret = argv.secret.trim();
var oa = new OAuth(REQUEST_TOKEN_URL, ACCESS_TOKEN_URL, key, secret, OAUTH_VERSION , null, HASH_VERSION); 
getRequestToken(oa);
