//dependencies for each module used
var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var InstagramStrategy = require('passport-instagram').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth').Strategy;
var http = require('http');
var path = require('path');
var handlebars = require('express-handlebars');
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var dotenv = require('dotenv');
var mongoose = require('mongoose');
var graph = require('fbgraph');
var Instagram = require('instagram-node-lib');
var Twitter = require('twitter');
var async = require('async');
var bcrypt   = require('bcrypt-nodejs');
var flash    = require('connect-flash');
var app = express();

var models = require('./models');

// load env variables
dotenv.load();

// Instagram environment set up
var INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
var INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
var INSTAGRAM_CALLBACK_URL = process.env.INSTAGRAM_CALLBACK_URL;
Instagram.set('client_id', INSTAGRAM_CLIENT_ID);
Instagram.set('client_secret', INSTAGRAM_CLIENT_SECRET);

// Facebook environment set up
var FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
var FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
var FACEBOOK_CALLBACK_URL = process.env.FACEBOOK_CALLBACK_URL;

// Twitter environment set up
var TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY;
var TWITTER_CONSUMER_SECRET= process.env.TWITTER_CONSUMER_SECRET;
var TWITTER_ACCESS_TOKEN_KEY = process.env.TWITTER_ACCESS_TOKEN_KEY;
var TWITTER_ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET;
var TWITTER_CALLBACK_URL = process.env.TWITTER_CALLBACK_URL;


// setup twitter here
var client = new Twitter({
  consumer_key: TWITTER_CONSUMER_KEY,
  consumer_secret: TWITTER_CONSUMER_SECRET,
  access_token_key: TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: TWITTER_ACCESS_TOKEN_SECRET,
});


//connect to database
mongoose.connect(process.env.MONGODB_CONNECTION_URL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  console.log("Database connected succesfully.");
});


/******************************************************************/
/************************* PASSPORT SETUP *************************/
/******************************************************************/

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Instagram profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Function that handles saving a user who is local to OUR webapp
passport.use('local-signup', new LocalStrategy({
    // by default, local strategy uses username and password, we will override with email
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback

  }, function(req, email, password, done) {

    // User.findOne wont fire unless data is sent back
    process.nextTick(function() {

      // find a user whose email is the same as the forms email
      // we are checking to see if the user trying to login already exists
      models.User.findOne({ 'email' :  email }, function(err, user) {

        // if there are any errors, return the error
        if (err)
            return done(err);

        // check to see if theres already a user with that email
        if (user) {
            return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
        } else {

            // if there is no user with that email
            // create the user
            var newUser            = new models.User();

            // set the user's local credentials
            newUser.email    = email;
            newUser.password = newUser.generateHash(password);
            newUser.fname    = req.body.fname;
            newUser.lname    = req.body.lname;

            // save the user
            newUser.save(function(err) {
                if (err)
                    throw err;
                return done(null, newUser);
            });
        }

      });    

    });

}));

passport.use('local-login', new LocalStrategy({
  // by default, local strategy uses username and password, we will override with email
  usernameField : 'email',
  passwordField : 'password',
  passReqToCallback : true // allows us to pass back the entire request to the callback
}, function(req, email, password, done) { // callback with email and password from our form

  // find a user whose email is the same as the forms email
  // we are checking to see if the user trying to login already exists
  models.User.findOne({ 'email' :  email }, function(err, user) {
    // if there are any errors, return the error before anything else
    if (err)
        return done(err);

    // if no user is found, return the message
    if (!user) { 
        return done(null, false, req.flash('loginMessage', 'No user with that email was found. Please register.')); // req.flash is the way to set flashdata using connect-flash
    }
    // if the user is found but the password is wrong
    if (!user.validPassword(password))
        return done(null, false, req.flash('loginMessage', 'Oops! Wrong password. Please try again.')); // create the loginMessage and save it to session as flashdata

    // all is well, return successful user
    return done(null, user);
  });

}));


// Use the InstagramStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Instagram
//   profile), and invoke a callback with a user object.
passport.use(new InstagramStrategy({
    clientID: INSTAGRAM_CLIENT_ID,
    clientSecret: INSTAGRAM_CLIENT_SECRET,
    callbackURL: INSTAGRAM_CALLBACK_URL,
    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
  },
  function(req, accessToken, refreshToken, profile, done) {

    ensureAuthenticated;

    // asynchronous
    process.nextTick(function() {

      // check if the user is already logged in
      if (!req.user) {

          // find the user in the database based on their facebook id
          models.User.findOne({ 'ig_id' : profile.id }, function(err, user) {

              // if there is an error, stop everything and return that
              // ie an error connecting to the database
              if (err)
                  return done(err);

              // if the user is found, then log them in
              if (user) {
                  return done(null, user); // user found, return that user
              } else {
                  // if there is no user found with that facebook id, create them
                  var newUser            = new models.User();

                  // set all of the facebook information in our user model
                  newUser.ig_id    = profile.id; // set the users facebook id                   
                  newUser.ig_access_token = accessToken; // we will save the token that facebook provides to the user                    
                  newUser.ig_exist = true;

                  // save our user to the database
                  newUser.save(function(err) {
                      if (err)
                          throw err;

                      // if successful, return the new user
                      return done(null, newUser);
                  });
              }

          });

      } else {

        models.User.findOne({email: req.user.email}, function (err, user) {

          user.ig_id    = profile.id;
          user.ig_access_token = accessToken;
          user.ig_exist = true;

          user.save(function (err) {
            if(err) {
              console.error('ERROR! CAN NOT UPDATE USER');
            }
            return done(null, user);

          });
        });
      }
    });
  }
));

// Use the FacebookStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Instagram
//   profile), and invoke a callback with a user object.
passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: FACEBOOK_CALLBACK_URL,
    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
  },
  function(req, accessToken, refreshToken, profile, done) {

    ensureAuthenticated;

    // asynchronous
    process.nextTick(function() {

      // check if the user is already logged in
      if (!req.user) {

          // find the user in the database based on their facebook id
          models.User.findOne({ 'fb_id' : profile.id }, function(err, user) {

              // if there is an error, stop everything and return that
              // ie an error connecting to the database
              if (err)
                  return done(err);

              // if the user is found, then log them in
              if (user) {
                  return done(null, user); // user found, return that user
              } else {
                  // if there is no user found with that facebook id, create them
                  var newUser            = new models.User();

                  // set all of the facebook information in our user model
                  newUser.fb_id    = profile.id; // set the users facebook id                   
                  newUser.fb_access_token = accessToken; // we will save the token that facebook provides to the user                    
                  newUser.fb_exist = true;

                  // save our user to the database
                  newUser.save(function(err) {
                      if (err)
                          throw err;

                      // if successful, return the new user
                      return done(null, newUser);
                  });
              }

          });

      } else {

        models.User.findOne({email: req.user.email}, function (err, user) {

          user.fb_id    = profile.id;
          user.fb_access_token = accessToken;
          user.fb_exist = true;

          user.save(function (err) {
            if(err) {
              console.error('ERROR! CAN NOT UPDATE USER');
            }
            return done(null, user);

          });
        });
      }
    });
  }
));


// Use the TwitterStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Instagram
//   profile), and invoke a callback with a user object.
passport.use(new TwitterStrategy({
    consumerKey: TWITTER_CONSUMER_KEY,
    consumerSecret: TWITTER_CONSUMER_SECRET,
    callbackURL: TWITTER_CALLBACK_URL,
    passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
  },
  function(req, accessToken, refreshToken, profile, done) {

    ensureAuthenticated;

    // asynchronous
    process.nextTick(function() {

      // check if the user is already logged in
      if (!req.user) {

          // find the user in the database based on their facebook id
          models.User.findOne({ 'tw_id' : profile.id }, function(err, user) {

              // if there is an error, stop everything and return that
              // ie an error connecting to the database
              if (err)
                  return done(err);

              // if the user is found, then log them in
              if (user) {
                  return done(null, user); // user found, return that user
              } else {
                  // if there is no user found with that facebook id, create them
                  var newUser            = new models.User();

                  // set all of the facebook information in our user model
                  newUser.tw_id    = profile.id; // set the users facebook id                   
                  newUser.tw_access_token = accessToken; // we will save the token that facebook provides to the user                    
                  newUser.ig_exist = true;

                  // save our user to the database
                  newUser.save(function(err) {
                      if (err)
                          throw err;

                      // if successful, return the new user
                      return done(null, newUser);
                  });
              }

          });

      } else {

        models.User.findOne({email: req.user.email}, function (err, user) {

          user.tw_id    = profile.id;
          user.tw_access_token = accessToken;
          user.tw_exist = true;

          user.save(function (err) {
            if(err) {
              console.error('ERROR! CAN NOT UPDATE USER');
            }
            return done(null, user);

          });
        });
      }
    });
  }
));

/******************************************************************/
/*************************** SETUP APP ****************************/
/******************************************************************/


//Configures the Template engine
app.engine('handlebars', handlebars({defaultLayout: 'layout'}));
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({ secret: 'keyboard cat',
                  saveUninitialized: true,
                  resave: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

//set environment ports and start application
app.set('port', process.env.PORT || 3000);

/******************************************************************/
/********************** ENSURE AUTHENTICATED **********************/
/******************************************************************/

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { 
    return next(); 
  }
  res.redirect('/login');
}


function ensureAuthenticatedInstagram(req, res, next) {
  if (req.isAuthenticated() && !!req.user.ig_id) { 
    return next(); 
  }
  res.redirect('/login');
}

function ensureAuthenticatedFacebook(req, res, next) {
  if (req.isAuthenticated() && !!req.user.fb_id) { 
    return next(); 
  }
  res.redirect('/login');
}

function ensureAuthenticatedTwitter(req, res, next) {
  if (req.isAuthenticated() && !!req.user.tw_id) { 
    return next(); 
  }
  res.redirect('/login');
}

/******************************************************************/
/************************ AUTHENTICATE CODE ***********************/
/******************************************************************/

app.get('/auth/instagram',
  passport.authenticate('instagram'),
  function(req, res){
    // The request will be redirected to Instagram for authentication, so this
    // function will not be called.
  });

app.get('/auth/instagram/callback', 
  passport.authenticate('instagram', { failureRedirect: '/login', approvalPrompt: 'force'}),
  function(req, res) {
    res.redirect('/account');
  });

app.get('/auth/facebook',
  passport.authenticate('facebook'),
  function(req, res){
    // The request will be redirected to Instagram for authentication, so this
    // function will not be called.
  });

app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login', approvalPrompt: 'force'}),
  function(req, res) {
    res.redirect('/account');
  });

app.get('/auth/twitter',
  passport.authenticate('twitter'),
  function(req, res){
    // The request will be redirected to Instagram for authentication, so this
    // function will not be called.
  });

app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { failureRedirect: '/login', approvalPrompt: 'force'}),
  function(req, res) {
    res.redirect('/account');
  });


/******************************************************************/
/************************* AUTHORIZE CODE *************************/
/******************************************************************/

// instagram -------------------------------
// send to instagram to do the authentication
app.get('/connect/instagram', passport.authorize('instagram'));

// handle the callback after facebook has authorized the user
app.get('/connect/instagram/callback',
    passport.authorize('instagram', {
        successRedirect : '/account',
        failureRedirect : '/'
    }));

// facebook -------------------------------
// send to facebook to do the authentication
app.get('/connect/facebook', passport.authorize('facebook', { scope : ['email', 'user_photos', 'user_status', 'user_likes', 'user_friends', 'user_photos'] }));

// handle the callback after facebook has authorized the user
app.get('/connect/facebook/callback',
    passport.authorize('facebook', {
        successRedirect : '/account',
        failureRedirect : '/'
    }));

// twitter --------------------------------
// send to twitter to do the authentication
app.get('/connect/twitter', passport.authorize('twitter', { scope : 'email' }));

// handle the callback after twitter has authorized the user
app.get('/connect/twitter/callback',
    passport.authorize('twitter', {
        successRedirect : '/account',
        failureRedirect : '/'
    }));


// google ---------------------------------
// send to google to do the authentication
app.get('/connect/google', passport.authorize('google', { scope : ['profile', 'email'] }));

// the callback after google has authorized the user
app.get('/connect/google/callback',
    passport.authorize('google', {
        successRedirect : '/account',
        failureRedirect : '/'
    }));



/******************************************************************/
/********************** UNLINK ACCOUNTS CODE **********************/
/******************************************************************/


// instagram -------------------------------
app.get('/unlink/instagram', function(req, res) {
    
  models.User.findOne({email: req.user.email}, function (err, user) {

    // change current sessions user as well so redirect is up to date
    req.user.ig_access_token = undefined;
    req.user.ig_id = undefined;
    req.user.ig_exist = false;

    user.ig_access_token = undefined;
    user.ig_id = undefined;
    user.ig_exist = false;
    user.save(function(err) {
      res.redirect('/account');
    });
  });
});

// facebook -------------------------------
app.get('/unlink/facebook', function(req, res) {

  models.User.findOne({email: req.user.email}, function (err, user) {

    // change current sessions user as well so redirect is up to date
    req.user.fb_access_token = undefined;
    req.user.fb_id = undefined;
    req.user.fb_exist = false;

    user.fb_access_token = undefined;
    user.fb_id = undefined;
    user.fb_exist = false;

    user.save(function(err) {
        res.redirect('/account');
    });
  });
});

// twitter --------------------------------
app.get('/unlink/twitter', function(req, res) {

  models.User.findOne({email: req.user.email}, function (err, user) {

    // change current sessions user as well so redirect is up to date
    req.user.tw_access_token = undefined;
    req.user.tw_id = undefined;
    req.user.tw_exist = false;

    user.tw_access_token = undefined;
    user.tw_id = undefined;
    user.tw_exist = false;

    user.save(function(err) {
       res.redirect('/account');
    });
  });
});


/******************************************************************/
/*********************** USER DEFINED ROUTES **********************/
/******************************************************************/
//routes
app.get('/', function(req, res){
  res.render('login');
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user, message: req.flash('loginMessage') });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/igphotos', ensureAuthenticatedInstagram, function(req, res){
  var query  = models.User.where({ ig_id: req.user.ig_id });
  query.findOne(function (err, user) {
    if (err) return err;
    if (user) {
      // doc may be null if no document matched
      Instagram.users.liked_by_self({
        access_token: user.ig_access_token,
        complete: function(data) {
          console.log(data);
          //Map will iterate through the returned data obj
          var imageArr = data.map(function(item) {
            //create temporary json object
            tempJSON = {};
            tempJSON.url = item.images.low_resolution.url;
            //insert json object into image array
            return tempJSON;
          });
          res.render('photos', {photos: imageArr});
        }
      }); 
    }
  });
});

app.get('/igMediaCounts', ensureAuthenticatedInstagram, function(req, res){
  var query  = models.User.where({ ig_id: req.user.ig_id });
  query.findOne(function (err, user) {
    if (err) return err;
    if (user) {
      Instagram.users.follows({ 
        user_id: user.ig_id,
        access_token: user.ig_access_token,
        complete: function(data) {
          // an array of asynchronous functions
          var asyncTasks = [];
          var mediaCounts = [];
           
          data.forEach(function(item){
            asyncTasks.push(function(callback){
              // asynchronous function!
              Instagram.users.info({ 
                  user_id: item.id,
                  access_token: user.ig_access_token,
                  complete: function(data) {
                    mediaCounts.push(data);
                    callback();
                  }
                });            
            });
          });
          
          // Now we have an array of functions, each containing an async task
          // Execute all async tasks in the asyncTasks array
          async.parallel(asyncTasks, function(err){
            // All tasks are done now
            if (err) return err;
            return res.json({users: mediaCounts});        
          });
        }
      });   
    }
  });
});

app.get('/fbLikeInfo', ensureAuthenticatedFacebook, function(req, res) {

  graph.setAccessToken(req.user.fb_access_token);

  graph.get("me", function(err, user) {

    if(err) { console.log(err); }

    graph.batch([
      { method: "GET", relative_url: "me/likes?filter=stream&limit=50"}

      ], function(err, data) {
        if(err) { console.log(err); }

        var likes_str_body = data[0].body;
        var likes_json_body = eval("(" + likes_str_body + ")");

        //console.log(likes_json_body);
          
        var pageQueries = [];
        var arr = likes_json_body.data;

        for( var i = 0; i < likes_json_body.data.length; ++i) {
          //console.log(arr[i]);

          pageQueries.push({method: "GET", relative_url: "" + arr[i].id + "?summary=true"});
          
        }

        graph.batch(pageQueries, function(err, allPages) {
          if(err) { console.log(err); }

          var allJsonPages = { data: [] };

          for( var j = 0; j < allPages.length; ++j) {
            var jsonPage = eval("(" + allPages[j].body + ")");
            
            allJsonPages.data.push(jsonPage);
          }

          res.json(allJsonPages);
        });

        //console.log(pageQueries);
        //res.json(likes_json_body);

      });
    });
});

app.get('/c3visualization2', ensureAuthenticatedTwitter, function(req, res) {

  //var params = {screen_name: 'nodejs'};
  client.get('statuses/home_timeline', function(error, tweets, response){
    if (!error) {
      console.log(tweets);
    }

    res.render('c3visualization2');
  });
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

// Register a new user to our SocialGraph webapp
app.post('/registerUser', passport.authenticate('local-signup', {
  successRedirect : '/account', // redirect to the secure account section
  failureRedirect : '/signup', // redirect back to the signup page if there is an error
  failureFlash : true // allow flash messages
}));

// Successfully login after authenticating user
app.post('/login', passport.authenticate('local-login', {
  successRedirect : '/account', // redirect to the secure account section
  failureRedirect : '/login', // redirect back to the signup page if there is an error
  failureFlash : true // allow flash messages
}));

app.get('/visualization', ensureAuthenticatedInstagram, function (req, res){
  res.render('visualization');
}); 

app.get('/c3visualization', ensureAuthenticatedInstagram, function (req, res){
  res.render('c3visualization');
}); 

app.get('/d3visualization2', ensureAuthenticatedInstagram, function (req, res) {
  res.render('d3visualization2');
});


/******************************************************************/
/*********************** CREATE SERVER CODE ***********************/
/******************************************************************/

http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});
