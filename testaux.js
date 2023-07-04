const payload = {
    name: "Prueba11111",
    description: "Descripción02"
  };
  
  fetch("http://localhost:3000/add?name=Test223&description=1123535", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error(error));