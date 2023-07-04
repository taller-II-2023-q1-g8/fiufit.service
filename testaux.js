const payload = {
    name: "Prueba11111",
    description: "Descripción02"
  };
  
  fetch("http://localhost:3000/add?name=Users&description=Users%20Microservice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error(error));