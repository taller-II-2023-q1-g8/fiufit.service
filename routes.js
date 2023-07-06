const { nanoid } = require("nanoid");
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require("swagger-ui-express");

const generateApiKey = () => nanoid(32);

function setupRoutes(app, client, enableLogging = true) {
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Service Manager API',
        version: '1.0.0',
        description: 'Microservice in charge of managing the services of the platform',
      },
      components: {
        schemas: {
          Service: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
              description: {
                type: 'string',
              },
              state: {
                type: 'string',
              },
              apiKey: {
                type: 'string',
              },
            },
          },
        },
      },
    },
    apis: ['./routes.js'],
  };
  const swaggerSpec = swaggerJsdoc(swaggerOptions);

  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  

  const servicesRef = client.db("services").collection("services");

  const activateService = async (serviceName) => {
    await servicesRef.updateOne(
      { name: serviceName },
      { $set: { state: "active" } }
    );
  }
    
  const blockService = async (serviceName) => {
    await servicesRef.updateOne(
      { name: serviceName },
      { $set: { state: "blocked" } }
    );
  }
    
  const listServices = async () => await servicesRef.find().toArray();

  const validateKey = async (apiKey) => {
    const service = await servicesRef.findOne({apiKey});
    if (service) {
      if (service.state === "active") {
        return true;
      } else {
        if (enableLogging)
          console.log("key", apiKey, "is not valid");
        return false;
      }
    } else {
      if (enableLogging)
        console.log("key", apiKey, "does not correspond to an existing service/app");
      return false;
    }
  }

 /**
 * @openapi
 * /:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns a message indicating the service is up and running.
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Health check message
 */
app.get("/", (req, res) => {
  res.json({
    message: "Service Handler up and running",
  });
});

 /**
   * @openapi
   * /services/list:
   *   get:
   *     summary: Get the list of services
   *     description: Returns the list of services.
   *     responses:
   *       200:
   *         description: Successful response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 services:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Service'
   */
  app.get("/services/list", async (req, res) => {
    try {
      const services = await listServices();
      res.json({ services });
    } catch (error) {
      if (enableLogging)
        console.error("Error al obtener la lista de servicios:", error);
      res.status(500).json({ error: "Error al obtener la lista de servicios" });
    }
  });

  /**
 * @openapi
 * /services/add:
 *   post:
 *     summary: Add a new service
 *     description: Registers a new service.
 *                  It returns the created service object with the generated API key.
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: The name of the service.
 *       - in: query
 *         name: description
 *         schema:
 *           type: string
 *         required: true
 *         description: The description of the service.
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Message indicating the service was added successfully.
 *                 service:
 *                   $ref: '#/components/schemas/Service'
 */
  app.post("/services/add", async (req, res) => {
    try {
      const { name, description } = req.query;

      if (enableLogging)
        console.log({ name, description });

      if (!name || !description) {
        return res
          .status(400)
          .json({ error: "Name and description are required" });
      }

      const apiKey = generateApiKey();
      if (enableLogging)
        console.log({apiKey});

      const newService = {
        name,
        description,
        state: "active",
        apiKey,
      };

      await servicesRef.insertOne(newService);

      res.json({
        message: "Servicio agregado correctamente",
        service: newService,
      });
    } catch (error) {
      if (enableLogging)
        console.error("Error al agregar servicio:", error);
      res.status(500).json({ error: "Error al agregar servicio" });
    }
  });

 /**
 * @openapi
 * /services/validate:
 *   post:
 *     summary: Validate API Key
 *     description: Checks whether the provided API key is valid or not.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apiKey:
 *                 type: string
 *             required:
 *               - apiKey
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Validation result message.
 *                   example: Key is valid
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Validation result message.
 *                   example: Key is not valid
 */
  app.post("/services/validate", async (req, res) => {
    const { apiKey } = req.body;
    if (enableLogging)
      console.log({apiKey});
      const valid = await validateKey(apiKey);
      if (valid) {
        res.status(200).json({ message: "Key is valid" });
      } else {
        res.status(401).json({ message: "Key is not valid" });
      }
  });

  /**
 * @openapi
 * /services/state/{serviceName}:
 *   get:
 *     summary: Get the state of a service by name
 *     description: Retrieve the state of a service based on its name.
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         description: The name of the service
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The state of the service
 *                   example: ServiceName is active
 *       211:
 *         description: Service is currently inactive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The state of the service
 *                   example: ServiceName is currently inactive
 *       204:
 *         description: Service does not exist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message indicating that the service does not exist
 *                   example: serviceName does not correspond to an existing service/app
 */
  app.get("/services/state/:serviceName", async (req, res) => {
    const { serviceName } = req.params;
    if (enableLogging)
      console.log({serviceName});
    const service = await servicesRef.findOne({name: serviceName});
    if (!service) {
      res.status(212).json({message: serviceName + " does not correspond to an existing service/app"});
      return;
    }
    const sstate = service.state;
    if (enableLogging)
      console.log({sstate});
    (sstate === "active") ?
    res.status(200).json({message: serviceName + " is active"}) :
    res.status(211).json({message: serviceName + " is currently inactive"});
  });

  /**
 * @openapi
 * /services/activate/{serviceName}:
 *   put:
 *     summary: Activate a service by name
 *     description: Activate a service based on its name.
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         description: The name of the service
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Activation success message
 *                   example: Servicio ServiceName activado
 */
  app.put("/services/activate/:serviceName", async (req, res) => {
    const { serviceName } = req.params;
    activateService(serviceName);
    res.json({ message: `Servicio ${serviceName} activado` });
  });

  /**
 * @openapi
 * /services/block/{serviceName}:
 *   put:
 *     summary: Block a service by name
 *     description: Block a service based on its name.
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         description: The name of the service
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Blocking success message
 *                   example: Servicio ServiceName bloqueado
 */
  app.put("/services/block/:serviceName", async (req, res) => {
    const { serviceName } = req.params;
    blockService(serviceName);
    res.json({ message: `Servicio ${serviceName} bloqueado` });
  });

  app.swaggerSpec = swaggerSpec;
}

module.exports = setupRoutes;
