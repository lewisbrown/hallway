/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/**
 * web server/service to wrap interactions w/ FB open graph
 */

var _debug = false;

var express = require('express'),
    connect = require('connect'),
    app = express.createServer(
                    connect.bodyParser(),
                    connect.cookieParser());
                    
var facebookClient = require('facebook-js')();
var uri, auth, callback;

exports.init = function(baseUri, storedAuth, app, onCompletedCallback) {
    uri = baseUri;
    callback = onCompletedCallback;
    auth = storedAuth || {};
    if(auth.appID && auth.appSecret && auth.token) {
        callback(auth, null, null);
    } else {
        app.get('/auth', handleAuth);
        app.get('/saveAuth', saveAuth);
    }
}
    
function handleAuth(req, res) {
    if(!req.param('code')) {
        if(!(auth && auth.appID && auth.appSecret)) {
            res.writeHead(200);
            res.end(displayHTML("Enter your personal FaceBook app info that will be used to sync your data" + 
                    " (create a new one <a href='http://www.facebook.com/developers/createapp.php'>here</a>" +
                    " using a callback url of http://"+url.parse(uri).host+"/) " +
                    "<form method='post' action='saveAuth'>" +
                        "App ID: <input name='appID'><br>" +
                        "App Secret: <input name='appSecret'><br>" +
                        "<input type='submit' value='Save'>" +
                    "</form>"));
            return;
        }
        if(!auth.token) {
            res.writeHead(200);
            res.end(displayHTML(getGoFB()));
        }
        else
            callback(auth, req, res);
    } else {
        var OAuth = require("oauth").OAuth2;
        var oa = new OAuth(auth.appID, auth.appSecret, 'https://graph.facebook.com');
        oa.getOAuthAccessToken(req.param('code'), {redirect_uri: uri+"auth"}, function(err, token, refresh) {
            if (err) {
                res.writeHead(500, {'Content-Type': 'text/html'});
                res.end(displayHTML("uhoh " + JSON.stringify(err)));
            } else {
                auth.token = token;
                callback(auth, req, res);
            }
        });
    }
}

function saveAuth(req, res) {
    if(!(req.body.appID && req.body.appSecret)) {
        res.writeHead(400, {'Content-Type': 'text/html'});
        res.end(displayHTML("missing field(s)?"));
        return;
    }
    res.writeHead(200, {'Content-Type': 'text/html'});
    auth.appID = req.body.appID;
    auth.appSecret = req.body.appSecret;
    res.end(displayHTML(getGoFB()));
}

function getGoFB() {
    return "you need to <a href='" + getAuthURI() + "'>auth w/ fb</a> yet";
}

function getAuthURI() {
    return facebookClient.getAuthorizeUrl({client_id: auth.appID, redirect_uri: uri+"auth",
                scope: 'email,offline_access,read_stream,user_photos,friends_photos,publish_stream'});
}

function displayHTML(content) {
    return "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
        + "<meta name='description' content='Locker Facebook Connector' />"
        + "<title>Facebook Connector - Locker</title>"
        + "<style type='text/css'>"
        + ".header{background:rgb(125,174,92);width: 100%;color: white;border-radius:50px;}" 
        + " .goback{position:absolute;left:90%;top:3%;}" + " .body{background:rgb(125,174,92);border-radius:14px;color: white;}" 
        + " .content{margin-left:1%;} h3{margin-left:1%;margin-bottom:0.5%;} a{color:white;} a:hover{color:rgb(199,199,199);}"
        + "</style>"
        + "</head><body>"
        + "<div class='header'><h3>Facebook Connector</h3><div class='goback'>"
        + "<a href='/'>Go back</a></div></div><div class='body'><div class='content'>"
        + content + "</div></body></html>";
}