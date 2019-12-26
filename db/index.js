const Database = require('better-sqlite3');
let db = new Database('./db/music-lists.db', { verbose: console.log });

const initDb = `
	CREATE TABLE IF NOT EXISTS list (
		id			INTEGER PRIMARY KEY,
		slug		TEXT,
		name 		TEXT,
		type		TEXT,
		source 	TEXT,
		year		INTEGER,
		public	INTEGER
	);

	CREATE TABLE IF NOT EXISTS list_item (
		id    	INTEGER PRIMARY KEY,
		rank		INTEGER,
		name		TEXT,
		artist	TEXT,
		list_id	INTEGER,
		FOREIGN KEY (list_id) REFERENCES list(id)
	);

	CREATE TABLE IF NOT EXISTS challenge (
		id    				INTEGER PRIMARY KEY,
		list_id				INTEGER,
		slug					TEXT,
		username			TEXT,
		datetime			INTEGER,
		FOREIGN KEY (list_id) REFERENCES list(id)
	);	

	CREATE TABLE IF NOT EXISTS report (
		id    				INTEGER PRIMARY KEY,
		list_id				INTEGER,
		username			TEXT,
		items_played	INTEGER,
		playcount			INTEGER,
		datetime			INTEGER,
		challenge_id	INTEGER,
		FOREIGN KEY (list_id) REFERENCES list(id),
		FOREIGN KEY (challenge_id) REFERENCES challenge(id)
	);

	CREATE UNIQUE INDEX IF NOT EXISTS report_uni_idx ON report (list_id, username, items_played, playcount)
	WHERE challenge_id IS NULL;
	
	CREATE UNIQUE INDEX IF NOT EXISTS challenge_report_uni_idx ON report (list_id, username, items_played, playcount, challenge_id)
	WHERE challenge_id IS NOT NULL;	
`;

db.exec(initDb);

module.exports = db;