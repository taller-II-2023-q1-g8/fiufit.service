const payload = {
    name: "Prueba",
    description: "Descripción0"
  };
  
  fetch("http://localhost:3000/add?name=Test3&description=123535", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error(error));