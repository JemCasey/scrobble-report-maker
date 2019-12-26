module.exports = {
	getAllPublicLists: 
		`SELECT slug id,
						name,
						source,
						type,
						year
		FROM	list
		WHERE	public=1
		ORDER BY name`,
	
	getPublicListsBySearch: 
		`SELECT slug id,
						name,
						source,
						type,
						year
		FROM list
		WHERE (name like $searchTerm
			OR	source like $searchTerm)
			AND	public=1
		ORDER BY name`,

	getListBySlug: 
		`SELECT id,
						slug,
						name,
						source,
						type,
						year,
						public
		FROM list
		WHERE slug = $slug`,
	
	getListById: 
		`SELECT	id,
						slug,
						name,
						source,
						year,
						type,
						public
		FROM list
		WHERE id = $id`,

	getItemsByListId: 
		`SELECT	rank,
						name,
						artist
		FROM list_item
		WHERE list_id = $id
		ORDER BY rank, name`,

	saveList:
	 `INSERT INTO list (
			slug,
			name,
			type,
			source,
			year,
			public
		) VALUES (
			lower(hex(randomblob(16))), 
			@name, 
			@type, 
			@source,
			@year,
			@public
		)`,
	
	saveListItem:
		`INSERT INTO list_item (
			rank,
			name,
			artist,
			list_id
		) VALUES (
			@rank, 
			@name, 
			@artist,
			@listId
		)`,

	saveReport: `
	INSERT OR IGNORE INTO report (
		list_id,
		username,
		items_played,
		playcount,
		challenge_id,
		datetime
	) VALUES (
		@listId,
		@username,
		@itemsPlayed,
		@playcount,
		@challengeId,
		strftime('%s','now')
	)
	`,
	
	getReportsByListId:
		`SELECT	username,
						items_played itemsPlayed,
						playcount,
						datetime(datetime, 'unixepoch', 'localtime') date
		FROM	report
		WHERE	list_id = $id
		ORDER BY items_played, playcount`,

	saveChallenge:
		`INSERT INTO challenge (
			list_id,
			slug,
			username,
			datetime
		) VALUES (
			@listId, 
			lower(hex(randomblob(16))),		
			@username, 
			strftime('%s','now')
		)`,
	
	getChallengeBySlug: 
		`SELECT id,
						slug,
						list_id,
						username,
						datetime
						name,
						source,
						year,
						type
		FROM 	challenge
		JOIN	list ON list_id = id
		WHERE slug = $slug`,
	
	getChallengeById: 
		`SELECT	id,
						slug,
						list_id,
						username,
						datetime
		FROM challenge
		WHERE id = $id`,
}