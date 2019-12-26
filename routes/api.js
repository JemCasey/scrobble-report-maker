var express = require('express');
var router = express.Router();
var got = require('got');
var db = require('../db');
var { getAllPublicLists, getListBySlug, getListById, getPublicListsBySearch, getItemsByListId, saveList, saveListItem, saveReport, getReportsByListId, saveChallenge, getChallengeById } = require('../queries');

var apiBase = process.env.LAST_FM_API_BASE;
var apiKey = process.env.LAST_FM_API_KEY;
var limit = process.env.LAST_FM_API_LIMIT;
var methods = {
	album: process.env.LAST_FM_API_ALBUMS_METHOD,
	track: process.env.LAST_FM_API_TRACKS_METHOD
}

var mbApiBase = process.env.MUSIC_BRAINZ_API_BASE;

var prepEntityValue = function (value) {
	return value.toLowerCase()
							.split('(')[0]
							.split('-')[0]
							.split('‐')[0]
							.replace(/[^A-Za-z0-9 ]/g, '')
							.trim();
}

var prepArtistValue = function (value) {
	return value.toLowerCase()
							.split(', ')[0]
							.replace(/[^A-Za-z0-9 ]/g, '')
							.trim();
}

var fetchLastFMItems = (url, type, prepValues) => {
	return new Promise(function (resolve, reject) {
		got(url, { json: true })
			.then(response => {
				var records = response.body[`top${type}s`][type].map((record) => ({
					playcount: record.playcount,
					artist: prepValues ? prepArtistValue(record.artist.name) : record.artist.name,
					name: prepValues ? prepEntityValue(record.name) : record.name,
					imageurl: record.image.length ? record.image[1]['#text'] : null,
					mbid: record.mbid
				}));

				resolve(records);
			})
			.catch(error => {
				reject(error);
			});
	});
}

router.get('/list', function (_req, res) {
	try {
		const query = db.prepare(getAllPublicLists);
		const lists = query.all();

		res.json({
			success: true,
			lists
		});
	} catch (error) {
		res.json({
			success: false,
			error: error.message
		});
	}
});

router.get('/list/:slug', function (req, res) {
	try {
		const getList = db.prepare(getListBySlug);
		const itemsQuery = db.prepare(getItemsByListId);
		var list = getList.get({ slug: req.params.slug });

		if (!list)
			res.status(404).send({
				success: false,
				message: 'List not found'
			});

		var { id, slug, name, source, year, type, public } = list;
		var items = itemsQuery.all({ id });

		res.json({
			success: true,
			list: {
				id: slug,
				name,
				source,
				year,
				type,
				public,
				items
			}
		});
	} catch (error) {
		res.json({
			success: false,
			error: error.message
		});
	}
});

router.post('/list/search', function (req, res) {
	try {
		const { searchTerm } = req.body;

		if (!searchTerm)
			res.status(400).send({
				success: false,
				error: "No search term provided"
			});

		const query = db.prepare(getPublicListsBySearch);
		const lists = query.all({ searchTerm: `%${searchTerm}%` });

		res.json({
			success: true,
			lists
		});
	} catch (error) {
		res.status(500).send({
			success: false,
			error: error.message
		});
	}
});

router.post('/list', function (req, res) {
	try {
		const { name, type, source, year, public, items } = req.body;
		const insertList = db.prepare(saveList);
		const insertListItem = db.prepare(saveListItem);
		const createList = db.transaction((list) => {
			var listRecord = insertList.run({ name: list.name, type: list.type, source: list.source, year: list.year, public: list.public ? 1 : 0 });
			list.items.forEach(item => {
				item.listId = listRecord.lastInsertRowid;
				insertListItem.run(item);
			});

			const getList = db.prepare(getListById);
			return getList.get({ id: listRecord.lastInsertRowid }).slug;
		});

		var slug = createList({
			name,
			type,
			source,
			year,
			public,
			items
		});

		res.json({
			success: true,
			id: slug
		});
	} catch (error) {
		res.status(500).send({
			success: false,
			error: error.message
		});
	}
});

router.post('/report', function (req, res) {
	try {
		const { listId, username, challengeId } = req.body;
		const query = db.prepare(getListBySlug);
		const itemsQuery = db.prepare(getItemsByListId);
		var list = query.get({ slug: listId });

		if (!list)
			res.status(404).send({
				success: false,
				message: 'List not found'
			});

		var listItems = itemsQuery.all({ id: list.id });
		const initialUrl = `${apiBase}&method=${methods[list.type]}&user=${username}&api_key=${apiKey}&limit=1`;

		got(initialUrl, { json: true })
			.then(function (json) {
				var pages = Math.ceil(json.body[`top${list.type}s`]["@attr"].total / limit);
				var baseUrl = `${apiBase}&method=${methods[list.type]}&user=${username}&api_key=${apiKey}&limit=${limit}&page=`;
				var i;
				var functions = [];

				for (i = 1; i <= pages; i++) {
					functions.push(fetchLastFMItems(`${baseUrl}${i}`, list.type));
				}

				Promise.all(functions).then(function (values) {
					var dictionary = values.reduce(function (result, item) {
						item.reduce(function (innerResult, innerItem) {
							var key = `${prepArtistValue(innerItem.artist)}~${prepEntityValue(innerItem.name)}`;
							if (innerResult[key])
								innerResult[key].playcount += parseInt(innerItem.playcount);
							else
								innerResult[key] = {
									playcount: parseInt(innerItem.playcount),
									imageurl: innerItem.imageurl
								};

							return innerResult;
						}, result);

						return result;
					}, {});

					var playcount = 0;
					var itemsPlayed = 0;
					var results = listItems.map(item => {
						var name = prepEntityValue(item.name);
						var artist = prepArtistValue(item.artist);
						var listenedItem = dictionary[`${artist}~${name}`];

						if (listenedItem) {
							item.playcount = listenedItem.playcount;
							item.imageurl = listenedItem.imageurl;

							playcount += item.playcount;
							itemsPlayed++;
						} else {
							item.playcount = 0;
						}

						return item;
					});

					const insertReport = db.prepare(saveReport);
					insertReport.run({ listId: list.id, username, playcount, itemsPlayed, challengeId });

					res.json({
						success: true,
						playcount,
						itemsPlayed,
						results
					});
				});
			})
			.catch(error => {
				res.status(500).json({
					success: false,
					message: error
				});
			});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error
		});
	}
});

router.get('/report/list/:listId', function (req, res) {
	try {
		const getList = db.prepare(getListBySlug);
		const getReports = db.prepare(getReportsByListId);
		var list = getList.get({ slug: req.params.listId });

		if (!list)
			res.status(404).send({
				success: false,
				message: 'List not found'
			});

		var reports = getReports.all({ id: list.id });

		res.send({
			success: true,
			reports
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error
		});
	}
});

router.post('/challenge', function (req, res) {
	try {
		const { listId, username } = req.body;
		const query = db.prepare(getListBySlug);
		var list = query.get({ slug: listId });

		if (!list)
			res.status(404).send({
				success: false,
				message: 'List not found'
			});

		const insertChallenge = db.prepare(saveChallenge);
		var challengeRecord = insertChallenge.run({ listId: list.id, username });

		const getChallenge = db.prepare(getChallengeById);
		var challenge = getChallenge.get({ id: challengeRecord.lastInsertRowid });

		res.json({
			success: true,
			id: challenge.slug
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error
		});
	}
});

router.post('/year-list', function (req, res) {
	const { username, type } = req.body;
	const initialUrl = `${apiBase}&method=${methods[type]}&user=${username}&api_key=${apiKey}&limit=1&period=12month`;

	got(initialUrl, { json: true })
		.then(function (json) {
			var pages = Math.ceil(json.body[`top${type}s`]["@attr"].total / limit);
			var baseUrl = `${apiBase}&method=${methods[type]}&user=${username}&api_key=${apiKey}&limit=${limit}&period=12month&page=`;
			var i;
			var functions = [];

			for (i = 1; i <= pages; i++) {
				functions.push(fetchLastFMItems(`${baseUrl}${i}`, type, false));
			}

			Promise.all(functions).then(function (values) {
				var allItems = [];
				var itemUrls = values.reduce(function (result, pageItems) {
					var j;
					pageItems = pageItems.filter(item => item.mbid);
					allItems = allItems.concat(pageItems);

					for (j = 0; j < pageItems.length / 100; j++) {
						var start = j * 100;
						var query = pageItems.slice(start, start + 100).map(item => `mbid:${item.mbid}`).join(' OR ');

						result.push(`${mbApiBase}/?query=${query}&inc=artist-credits&limit=100&fmt=json`);
					}

					return result;
				}, []);

				var results = [];
				var currentYear = new Date().getFullYear();
				var totalCalls = itemUrls.length;
				var callsCompleted = 0;
				var complete = function () {
					if (callsCompleted === totalCalls) {
						res.json({
							success: true,
							results: results.sort((a, b) => (a.playcount < b.playcount) ? 1 : -1)
						});
					}
				}

				for (i = 0; i < itemUrls.length; i++) {
					console.log(itemUrls.length);
					setTimeout(function (index) {
						got(itemUrls[index], {
							json: true,
							headers: {
								'user-agent': `test-app/1.1 (https://github.com/JemCasey)`
							}
						})
							.then(function (response) {
								response.body.releases.forEach(release => {
									if (new Date(release.date).getFullYear() === currentYear 
										&& (release["release-group"]["primary-type"] === "Album"
										|| release["release-group"]["primary-type"] === "EP")) {
										var lastFmItem = allItems.find(item => item.mbid === release.id);

										results.push({
											name: release.title,
											artist: release["artist-credit"].map(artist => artist.artist.name).join(', '),
											playcount: parseInt(lastFmItem.playcount),
											imageurl: lastFmItem.imageurl
										});
									}
								});

								callsCompleted++;
								complete();
							})
							.catch(function (error) {
								res.status(500).json({
									success: false,
									message: error
								});
							});

					}, i * itemUrls.length * 50, i);
				}
			});
		})
		.catch(error => {
			res.status(500).json({
				success: false,
				message: error
			});
		});
});

module.exports = router;
