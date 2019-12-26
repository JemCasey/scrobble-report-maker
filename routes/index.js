var express = require('express');
var router = express.Router();
var db = require('../db');
var { getListBySlug, getChallen } = require('../queries');

router.get('/', function(_req, res) {
  res.render('index', { title: 'Home' });
});

router.get('/list', function(_req, res) {
  res.render('list', { title: 'Get a listening report' });
});

router.get('/leaderboard/:listId', function(req, res) {
  const getList = db.prepare(getListBySlug);
  var list = getList.get({ slug: req.params.listId });
  
  res.render('leaderboard', { title: 'List Leaderboard', list });
});

router.get('/report/:listId/:username', function(req, res) {
  const getList = db.prepare(getListBySlug);
  var list = getList.get({ slug: req.params.listId });

  res.render('report', { title: 'Listening Report', list, username: req.params.username});
});

router.get('/report/:challengeId', function(req, res) {
  const getChallenge = db.prepare(getChallengeBySlug);
  var challenge = getChallenge.get({ slug: req.params.challengeId });

  res.render('report', { title: 'Challenge', challenge, username: req.params.username});
});

router.get('/year-list', function(_req, res) {
  res.render('yearlist', { title: 'Create a End of Year List' });
});

module.exports = router;
