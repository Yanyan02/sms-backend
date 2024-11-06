
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'

const collection = "es-subject"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {
    "create-subject": {
      date: Joi.string(),
      name: Joi.string(),
      description: Joi.string(),
    },
    "get-subject": {},
    "update-subject": {
      _id: object_id,
      title: Joi.string()
    },
  },
  handlers: {
    "POST": {
      "create-subject"(req, res) {
        console.log("Reqqqqqqqq", req.body);
        this.create_subject(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(500).json({ error }));
      },
    },
    "GET": {
      "get-subject"(req, res) {
        this.get_subject().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    },
    "PUT": {
      "update-subject"(req, res) {
        const { _id, title } = req.body
        this.update_subject(_id, title).then(() => res.json({ data: "Successfully Update subject" }))
          .catch((error) => res.status(400).json({ error }))
      }
    }
  },
  controllers: {

    async create_subject(data) {
      const result = await this.db?.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Could not create subject");
      return Promise.resolve("Successfully created subject")

    },

    async get_subject() {
      return this.db?.collection(collection).find({}).toArray()
    },

    async update_subject(id, title) {
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