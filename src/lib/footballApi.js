import axios from "axios";

const footballApi = axios.create({
  baseURL: "/api",
  timeout: 20000,
});

export default footballApi;
