import axios from "axios";

const footballClient = axios.create({
  baseURL: "https://api.football-data.org/v4",
  timeout: 15000,
  headers: {
    "X-Auth-Token": process.env.FOOTBALL_API_KEY,
  },
});

export default footballClient;
