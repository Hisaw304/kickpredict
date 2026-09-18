import axios from "axios";

const footballApi = axios.create({
  baseURL: "/api",
});

export default footballApi;
