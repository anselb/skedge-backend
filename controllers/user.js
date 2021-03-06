const Business = require('../models/Business.js');
const reqLogin = require('../middlewares/requireLogin.js');
const reqAdmin = require('../middlewares/requireAdmin.js');
const configKeys = require('../config/keys.js');

module.exports = (passport, app, User) => {

  app.get('/auth/google', passport.authenticate('google',
    {
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar'],
      callbackURL : '/auth/google/callback',
      accessType: 'offline',
      prompt: 'consent'
    })
  );

  app.get('/auth/google/callback', passport.authenticate('google', {
      callbackURL : '/auth/google/callback'
    }), (req, res) => {
     if(req.user.name){
       res.redirect(`${configKeys.domain}/dashboard`);
     }else{
       User.findById(req.user._id).then((user) => {
         user.admin = true;
         user.save().then(() => {
           res.redirect(`${configKeys.domain}/account/setup`);
         });
       })
     }
    }
  );

  app.get('/auth/outlook',
    passport.authenticate('windowslive', {
      scope: [
        'openid',
        'profile',
        'offline_access',
        'https://outlook.office.com/Mail.Read'
      ],
      callbackURL : '/auth/outlook/callback',
    })
  );

app.get('/auth/outlook/callback',
  passport.authenticate('windowslive', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.send(req.user)
  });

  app.get('business/register/auth/google', passport.authenticate('google',
    {
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar'],
      callbackURL : 'business/register/auth/google/callback',
      accessType: 'offline',
      prompt: 'consent'
    })
  );

  app.get('business/register/auth/google/callback', passport.authenticate('google', {
      callbackURL : 'business/register/auth/google/callback'
    }), (req, res) => {
     if(req.user.name){
       res.redirect('/dashboard');
     }else{
       res.redirect('/business/register/account/setup');
     }
    }
  );

  app.get('/api/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });


  app.get('/api/current_user', (req, res) => {
    res.send(req.user);
  })

  // Finish User Account
  app.post('/api/user/new', reqLogin, (req, res) => {
    User.findById(req.user._id).then((user) => {
      user.name = req.body.name;
      user.phone = req.body.phone;
      // If User created is an admin for a new business
      if(user.admin){
        let business = new Business();
        business.name = req.body.business;
        business.admin = req.user._id;
        business.employees.push(req.user._id);
        business.save().then((business) => {
          business.createDefaultCampaigns(business._id);
          user.business = business._id;
          user.save().then(() => {
            res.redirect('/');
          });
        })
      //Else User created is joining an existing business
      }else{
        Business.findById(req.body.business_id).then((business) => {
          business.employees.push(req.user._id);
          user.business = business._id;
          business.save();
          user.save().then(() => {
            res.redirect('/');
          })
        })
      }
    }).catch((err) => {
      console.log(err);
    })
  })

  app.get('/api/users/emails', reqLogin, reqAdmin, (req, res) => {
    User.find().then((users) => {
      let emails = [];
      users.map((user) => {
        emails.push(user.email);
      })
      res.send(emails);
    })
  })

}
