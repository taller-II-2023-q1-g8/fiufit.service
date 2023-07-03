
const axios = require("axios");

const url = "http://localhost:3000/add";
const data = {
  name: "Prueba",
  description: "Descripción0",
};

axios.post(url, data)
  .then((response) => {
    console.log(response.data);
  })
  .catch((error) => {
    console.error(error);
  });