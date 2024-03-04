const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

module.exports = app;

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertDbObjectToResponsiveObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
    playerMatchId: dbObject.player_match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

app.get("/players/", async (request, response) => {
  const playerQuery = `
        SELECT
            *
        FROM
            player_details
        ORDER BY
            player_id;`;
  const playerArray = await db.all(playerQuery);
  response.send(
    playerArray.map((eachArray) => convertDbObjectToResponsiveObject(eachArray))
  );
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetailsQuery = `
        SELECT
            *
        FROM
            player_details
        WHERE
            player_id = ${playerId};`;
  const player = await db.get(playerDetailsQuery);
  response.send(convertDbObjectToResponsiveObject(player));
});

app.put("/players/:playerId", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;
  const updatePlayerDetails = `
        UPDATE
            player_details
        SET
            player_name = '${playerName}'
        WHERE
            player_id = ${playerId};`;

  await db.run(updatePlayerDetails);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `
        SELECT
            *
        FROM
            match_details
        WHERE
            match_id = ${matchId};`;
  const match = await db.get(getMatchQuery);
  response.send(convertDbObjectToResponsiveObject(match));
});

app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchesQuery = `
        SELECT
            match_id,
            match,
            year
        FROM
            player_match_score NATURAL JOIN match_details
        WHERE
            player_id = ${playerId};`;
  const matchesQuery = await db.all(getPlayerMatchesQuery);
  response.send(
    matchesQuery.map((eachArray) =>
      convertDbObjectToResponsiveObject(eachArray)
    )
  );
});

app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayers = `
        SELECT
            player_id,
            player_name
        FROM
            player_details NATURAL JOIN player_match_score
        WHERE
            match_id = ${matchId};`;
  const playerName = await db.all(getMatchPlayers);
  response.send(
    playerName.map((eachArray) => convertDbObjectToResponsiveObject(eachArray))
  );
});

app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const playerMatchDetails = `
        SELECT
            player_details.player_id AS playerId,
            player_details.player_name AS playerName,
            SUM(score) AS totalScore,
            SUM(fours) AS totalFours,
            SUM(sixes) AS totalSixes
        FROM
            player_details INNER JOIN player_match_score ON player_details.player_id = player_match_score.player_id
        WHERE
            player_details.player_id = ${playerId};`;
  const result = await db.get(playerMatchDetails);
  response.send(result);
});
