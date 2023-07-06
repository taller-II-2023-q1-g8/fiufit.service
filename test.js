const chai = require("chai");
const expect = chai.expect;
const request = require("supertest");

const setupRoutes = require("./routes").setupRoutes;
const validateKey = require("./routes").validateKey;

// DB Mock
const mockCollection = {
  data: [],
  updateOne: (filter, action) => {
    const { name } = filter;
    const { $set } = action;
    const service = mockCollection.data.find((item) => item.name === name);
    if (service) {
      service.state = $set.state;
    }
  },
  find: () => ({
    toArray: () => mockCollection.data,
  }),
  findOne: (filter) => {
    const { name, apiKey } = filter;
    let service;
    if (name) {
      service = mockCollection.data.find((item) => item.name === name);
    } else if (apiKey) {
      service = mockCollection.data.find((item) => item.apiKey === apiKey);
    }
    if (!service) {
      return Promise.resolve(null);
    } else {
      return Promise.resolve({ state: service.state });
    }
  },
  insertOne: (item) => {
    mockCollection.data.push(item);
  },
};

const mockClient = {
  db: () => ({
    collection: () => mockCollection,
  }),
};

const app = require("express")();
setupRoutes(app, mockClient, false);

describe("Tests", () => {
  let server;
  before((done) => {
    process.env.ENABLE_LOGGING = 0;
    server = app.listen(3000, () => {
      done();
    });
  });

  after((done) => {
    server.close(() => {
      console.log("\nTesting Finished.");
      process.exit(0);
      done();
    });
  });

  it("should return a success response for the root endpoint", (done) => {
    request(app)
      .get("/")
      .expect(200)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res.body).to.deep.equal({
          message: "Service Handler up and running",
        });
        done();
      });
  });

  it("should return an empty list of services for the '/services/list' endpoint", (done) => {
    request(app)
      .get("/services/list")
      .expect(200)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res.body).to.deep.equal({ services: [] });
        done();
      });
  });

  it("should correctly add a new service into the collection", (done) => {
    const newService = {
      name: "Test Service",
      description: "Test service description"
    };
  
    request(app)
      .post(`/services/add?name=${newService.name}&description=${newService.description}`)
      .send(newService)
      .expect(200)
      .end((err, res) => {
        expect(err).to.be.null;
      
        expect(res.body.service.name).to.deep.equal(newService.name);
        expect(res.body.service.description).to.deep.equal(newService.description);
        expect(res.body.service.state).to.deep.equal("active");
        expect(res.body.service.apiKey).to.have.lengthOf(32);
        newService.apiKey = res.body.service.apiKey;
        newService.state = "active";
        expect(mockCollection.data).to.deep.include(newService);
      });

      request(app)
      .get("/services/list")
      .expect(200)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res.body).to.deep.equal({ services: [newService] });
        done();
      });
  });
  
  it("should return the correct service state for a valid service name", (done) => {
    const serviceName = "Test Service";
    const activeService = {
      name: serviceName,
      state: "active",
    };
    mockCollection.data.push(activeService);
  
    request(app)
      .get(`/services/state/${serviceName}`)
      .expect(200)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res.body.message).to.equal(`${serviceName} is active`);
        done();
      });
  });
  
  it("should return 'currently inactive' for an inactive service name", (done) => {
    const serviceName = "Inactive Service";
    const inactiveService = {
      name: serviceName,
      state: "inactive",
    };
    mockCollection.data.push(inactiveService);
  
    request(app)
      .get(`/services/state/${serviceName}`)
      .expect(211)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res.body.message).to.equal(`${serviceName} is currently inactive`);
        done();
      });
  });

  it("should return 'does not correspond to an existing service/app' for an service that doesn't exist", (done) => {
    const serviceName = "Nonexistent Service";
  
    request(app)
      .get(`/services/state/${serviceName}`)
      .expect(212)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res.body.message).to.equal(`${serviceName} does not correspond to an existing service/app`);
        done();
      });
  });

  it("should return true for key corresponding to an active service", (done) => {
    const apiKey = 'valid-api-key';

    mockCollection.data.push({
      name: "Active Key service",
      state: "active",
      apiKey: apiKey,
    });

    validateKey(apiKey, false, mockCollection)
    .then((isValid) => {
      expect(isValid).to.be.true;
      done();
    })
    .catch((error) => {
      done(error);
    });
  });
  
  it("should return false for a key corresponding to a blocked service", (done) => {
    const apiKey = 'invalid-api-key';

    mockCollection.data.push({
      name: "Blocked service",
      state: "blocked",
      apiKey: apiKey,
    });
  
    validateKey(apiKey, false, mockCollection)
    .then((isValid) => {
      expect(isValid).to.be.false;
      done();
    })
    .catch((error) => {
      done(error);
    });
  });

  it("should return false for a key not corresponding to a service", (done) => {
    const apiKey = 'non-existent-api-key';
  
    validateKey(apiKey, false, mockCollection)
    .then((isValid) => {
      expect(isValid).to.be.false;
      done();
    })
    .catch((error) => {
      done(error);
    });
  });

  it("should activate a non-active service", (done) => {
    const apiKey = "valid-api-key";
    const serviceName = "Test Service";
    mockCollection.data.push({
      name: serviceName,
      description: "Test Description",
      state: "blocked",
      apiKey: apiKey,
    });
  
    request(app)
      .put(`/services/activate/${serviceName}`)
      .expect(200)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(mockCollection.data[0].state).to.equal("active");
        expect(res.body.message).to.equal(`Servicio ${serviceName} activado`);
        done();
      });
  });

  it("should not affect the already active service", (done) => {
    const apiKey = "valid-api-key";
    const serviceName = "Test Service";
    mockCollection.data.push({
      name: serviceName,
      description: "Test Description",
      state: "active",
      apiKey: apiKey,
    });
  
    request(app)
      .put(`/services/activate/${serviceName}`)
      .expect(200)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(mockCollection.data[0].state).to.equal("active");
        expect(res.body.message).to.equal(`Servicio ${serviceName} activado`);
        done();
      });
  });

  it("should block the active active service", (done) => {
    const apiKey = "valid-api-key";
    const serviceName = "Test Service";
    mockCollection.data.push({
      name: serviceName,
      description: "Test Description",
      state: "active",
      apiKey: apiKey,
    });
  
    request(app)
      .put(`/services/block/${serviceName}`)
      .expect(200)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(mockCollection.data[0].state).to.equal("blocked");
        expect(res.body.message).to.equal(`Servicio ${serviceName} bloqueado`);
        done();
      });
  });

  
  it("should not affect the already blocked service", (done) => {
    const apiKey = "valid-api-key";
    const serviceName = "Test Service";
    mockCollection.data.push({
      name: serviceName,
      description: "Test Description",
      state: "blocked",
      apiKey: apiKey,
    });
  
    request(app)
      .put(`/services/block/${serviceName}`)
      .expect(200)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(mockCollection.data[0].state).to.equal("blocked");
        expect(res.body.message).to.equal(`Servicio ${serviceName} bloqueado`);
        done();
      });
  });

});
