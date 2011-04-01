var sys= require('sys')

var OAuth= require('node-oauth').OAuth;
/*var key = "key"*/
/*var secret = "secret"*/
var key = 'IplmVMSk2qr6uNG6Pw11hg'
var secret = 'zVrKkW8YMWS56WrpPxBjXY9HmpUnZe7AiRCytog8uI'
//var requestTokenUrl = "http://term.ie/oauth/example/request_token.php"
//var accessTokenUrl = "http://term.ie/oauth/example/access_token.php"
var requestTokenUrl = 'https://api.twitter.com/oauth/request_token'
var accessTokenUrl = 'https://api.twitter.com/oauth/access_token'

var oa= new OAuth(requestTokenUrl, accessTokenUrl, key, secret, "1.0A", 'http://127.0.0.1/authdone', "HMAC-SHA1")

oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
  if(error) sys.puts('error :' + error)
  else { 
    sys.puts('oauth_token :' + oauth_token)
    sys.puts('oauth_token_secret :' + oauth_token_secret)
    sys.puts('requestoken results :' + sys.inspect(results))
    sys.puts("Requesting access token")
    oa.getOAuthAccessToken(oauth_token, oauth_token_secret, function(error, oauth_access_token, oauth_access_token_secret, results2) {
      sys.puts('oauth_access_token :' + oauth_access_token)
      sys.puts('oauth_token_secret :' + oauth_access_token_secret)
      sys.puts('accesstoken results :' + sys.inspect(results2))
      sys.puts("Requesting access token")
      var data= "";
      oa.getProtectedResource("http://term.ie/oauth/example/echo_api.php?foo=bar&too=roo", "GET", oauth_access_token, oauth_access_token_secret,  function (error, data, response) {
          sys.puts(data);
      });
    });
  }
})



/*var OAuth2 = require('oauth').OAuth2*/
/*var sys = require('sys')*/
/*var oa = new OAuth2("https://twitter.com/oauth/request_token",*/
/*"https://twitter.com/oauth/access_token",*/
/*"IplmVMSk2qr6uNG6Pw11hg",*/
/*"zVrKkW8YMWS56WrpPxBjXY9HmpUnZe7AiRCytog8uI",*/
/*"1.0A",*/
/*null,*/
/*"HMAC-SHA1")*/

/*oa.getOAuthRequestToken(*/
/*function(error, oauth_token, oauth_token_secret, results){*/
/*if(error) sys.puts("error:" + error)*/
/*else{*/
/*sys.puts('oauth_token :' + oauth_token)*/
/*sys.puts('oauth_token_secret :' + oauth_token_secret)*/
/*sys.puts('requestoken results :' + sys.inspect(results))*/
/*sys.puts("Requesting access token")*/
/*oa.getOAuthAccessToken(oauth_token, oauth_token_secret,*/
/*function(error, oauth_access_token, oauth_access_token_secret, results2) {*/
/*sys.puts('oauth_access_token :' + oauth_access_token)*/
/*sys.puts('oauth_token_secret :' + oauth_access_token_secret)*/
/*sys.puts('accesstoken results :' + sys.inspect(results2))*/
/*sys.puts("Requesting access token")*/
/*var data= "";*/
/*//oa.getProtectedResource("http://term.ie/oauth/example/echo_api.php?foo=bar&too=roo", "GET", oauth_access_token, oauth_access_token_secret,  function (error, data, response) {*/
/*//sys.puts(data);*/
/*//});*/
/*});*/
/*}*/
/*}*/
/*)*/



/*

var consumerKey = 'Bwl6RuAsRdF6WNSdTIO2jw';
var consumerSecret = 'ZlzjyRkAlkAaWf6Lrepby3YtmkvMHY3NK0DVqG7GFc';
var client = oauth.createClient(443,'api.twitter.com',true);
client = oauth.createClient(443,'api.twitter.com',true)

//oauth setup
var consumer = oauth.createConsumer(consumerKey,consumerSecret);
var token = oauth.createToken();
var signer = oauth.createHmac(consumer);

//endpoints
var requestTokenUrl = '/oauth/request_token';
var accessTokenUrl = '/oauth/access_token';
var authorizeTokenUrl = '/oauth/authorize';
var data = '';
var tokenData = '';
var requestToken = client.request('POST',requestTokenUrl,null,null,signer);
requestToken.end();
requestToken.addListener('response', function (response) {
  response.addListener('data', function (chunk) { data+=chunk });
  response.addListener('end', onRequestTokenResponse);
});

function onAccessTokenReceived() {
  token.decode(tokenData);
  //The body passed in should be an object to both the request and when writing
  //this allows the base string and body to be properly encoded
  var body = { status: 'testing' };
  //Note the two extra params, the body and signature
  var request = client.request('POST','/1/statuses/update.json',null,body,signer);
  //The rest of the code is standard node
  var data = '';
  request.write(body);
  request.end();  
  request.addListener('response', function(response) {
    response.addListener('data',function(chunk) { data+=chunk })
    response.addListener('end',function() { sys.print(sys.inspect(data)); sys.print('\n'); });
  });
}

function onAccessTokenResponse(response) {
  response.addListener('data', function(chunk) { tokenData+=chunk });
  response.addListener('end', onAccessTokenReceived);
}

function onRequestTokenResponse() {
  token.decode(data);
  sys.p(data)
  sys.print('Visit the following website\n');
  sys.print('https://api.twitter.com'+authorizeTokenUrl+'?oauth_token='+token.oauth_token + '\n');
  sys.print('Enter verifier>')
  stream = process.openStdin();
  stream.addListener('data', onVerifierReceived);
}

function onVerifierReceived(chunk) {
  var tokenData = '';
  token.oauth_verifier = chunk.toString('utf8',0,chunk.length-1);
  stream.removeListener('data',arguments.callee);
  signer.token = token;
  var accessToken = client.request('POST',accessTokenUrl,null,null,signer);
  accessToken.addListener('response', onAccessTokenResponse);
  accessToken.end();
}

*/
