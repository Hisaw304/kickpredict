import axios from "axios";

const footballApi = axios.create({
  baseURL: "/football-api",
  headers: {
    "X-Auth-Token": import.meta.env.VITE_FOOTBALL_API_KEY,
  },
});

export default footballApi;
