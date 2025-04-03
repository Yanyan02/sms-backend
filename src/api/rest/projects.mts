
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'

const collection = "projects"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {
    "create-project": {
          date:  Joi.string(),
      name:  Joi.string(),
  engineer:  Joi.string(),
  address:  Joi.string(),
  status :  Joi.string(),
  control_number :  Joi.string(),
    },
    "get-project": {},
    "update-project": {
      _id: object_id,
      title: Joi.string()
    },
  },
  handlers: {
    "POST": {
      "create-project"(req, res) {
        console.log("Reqqqqqqqq", req.body);
        this.create_project(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(500).json({ error }));
      },
    },
    "GET": {
      "get-project"(req, res) {
        this.get_project().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    },
    "PUT": {
      "update-project"(req, res) {
        const { _id, title } = req.body
        this.update_project(_id, title).then(() => res.json({ data: "Successfully Update project" }))
          .catch((error) => res.status(400).json({ error }))
      }
    }
  },
  controllers: {

    async create_project(data) {
      const result = await this.db?.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Could not create project");
      return Promise.resolve("Successfully created project")

    },

    async get_project() {
      return this.db?.collection(collection).find({}).toArray()
    },

    async update_project(id, title) {
      const result = await this.db?.collection(collection).updateOne(
        { _id: new ObjectId(id) },
        { $set: { title: title } }
      );
      if (result.matchedCount === 0) {
        return Promise.reject("Item not Found, Failed to Update!");
      }
      return result;
    }

  }
})