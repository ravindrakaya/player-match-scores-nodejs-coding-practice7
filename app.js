const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json()); //Middle Ware

const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const matchObjToResponseObj = (dbObject) => ({
  matchId: dbObject.match_id,
  match: dbObject.match,
  year: dbObject.year,
});

const playerObjToResponseObj = (dbObject) => ({
  playerId: dbObject.player_id,
  playerName: dbObject.player_name,
});

// 1. Returns a list of all the players in the player table API
app.get("/players/", async (request, response) => {
  const playersQuery = `SELECT * FROM player_details ORDER BY player_id;`;
  const playerList = await db.all(playersQuery);
  const result = playerList.map((eachObj) => playerObjToResponseObj(eachObj));
  response.send(result);
});

// 2. Returns a specific player based on the player ID API
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `SELECT * FROM player_details WHERE player_id=${playerId};`;
  const player = await db.get(getPlayerQuery);
  response.send({
    playerId: player["player_id"],
    playerName: player["player_name"],
  });
});

// 3. Updates the details of a specific player based on the player ID API
app.put("/players/:playerId/", (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;
  const putPlayerNameQuery = `UPDATE player_details
                                  SET 
                                      player_name = "${playerName}"
                                    WHERE  player_id = ${playerId};`;
  db.run(putPlayerNameQuery);
  response.send("Player Details Updated");
});

// 4.Returns the match details of a specific match API
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `SELECT * FROM match_details WHERE match_id = ${matchId};`;
  const matchList = await db.get(getMatchQuery);
  response.send({
    matchId: matchList["match_id"],
    match: matchList["match"],
    year: matchList["year"],
  });
});

// 5. Returns a list of all the matches of a player API
app.get("/players/:playerId/matches", async (request, response) => {
  const getMatchesQuery = `SELECT * FROM match_details ORDER BY match_id;`;
  const matchesList = await db.all(getMatchesQuery);
  response.send(matchesList.map((eachObj) => matchObjToResponseObj(eachObj)));
});

// 6. Returns a list of players of a specific match API
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const particularMatchQuery = `SELECT 
                                        player_details.player_id,
                                        player_details.player_name
                                    FROM player_match_score INNER JOIN player_details
                                    ON player_details.player_id = player_match_score.player_id
                                    WHERE match_id = ${matchId};`;
  const matchPlayerList = await db.all(particularMatchQuery);
  response.send(
    matchPlayerList.map((eachObj) => playerObjToResponseObj(eachObj))
  );
  //console.log(matchPlayerList);
});

// 7. Returns the statistics of the total score, fours, sixes of a specific player based on the player ID API
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;

  const statisticsQuery = `SELECT 
                                    player_details.player_id AS playerId,
                                    player_details.player_name AS playerName,
                                    SUM(player_match_score.score) AS totalScore,
                                    SUM(player_match_score.fours) AS totalFours,
                                    SUM(player_match_score.sixes) AS totalSixes
                                FROM player_match_score INNER JOIN player_details
                                ON player_details.player_id = player_match_score.player_id
                                WHERE playerId = ${playerId};`;
  const stats = await db.get(statisticsQuery);
  response.send(stats);
});

module.exports = app;
