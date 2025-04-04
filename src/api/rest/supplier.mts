
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'

const collection = "suppliers"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {
    "create-supplier": {
      date:  new Date(),
      name :Joi.string(),
      owner: Joi.string(),
     address :  Joi.string(),
     nature: Joi.string(),
     email : Joi.string(),
     contact_person: Joi.string(),
     contact_number:  Joi.string(),
     products : Joi.array().optional(),
     company_profile :  Joi.array().optional(),
     catalog :  Joi.array().optional(),

    },
    "get-supplier": {
    },
    "get-supplier-id": {
    id: object_id
    },
    "update-supplier": {
      _id: object_id,
      title: Joi.string()
    },
  },
  handlers: {
    "POST": {
      "create-supplier"(req, res) {
        this.create_supplier(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(500).json({ error }));
      },
    },
    "GET": {
      "get-supplier"(req, res) {
        this.get_supplier().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
            "get-supplier-id"(req, res) {
        this.get_supplier_id(req.query).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    },
    "PUT": {
      "update-supplier"(req, res) {
        const { _id, title } = req.body
        this.update_supplier(_id, title).then(() => res.json({ data: "Successfully Update supplier" }))
          .catch((error) => res.status(400).json({ error }))
      }
    }
  },
  controllers: {
   async create_supplier(data) {
     const result = await this.db?.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Could not create project");
      return Promise.resolve("Successfully created project")

    
},
async get_supplier() {
return this.db?.collection("suppliers").find({}).toArray();

},
async get_supplier_id(id: any) {

 return this.db?.collection("suppliers").aggregate([
    {
  $match: new ObjectId(id)
    },
     {
      $lookup: {
        from: "projects",
        localField: "project",
        foreignField: "_id",
        as: "project",
      },
    },
    { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } }, 
    {
      $project: {
        items: 1,
        no: 1,
        project: "$project.name",
        address: "$project.address",
        date_requested: 1,
        requested_by: 1,
        type : 1
      },
    }
  ]).toArray();

},





    async update_supplier(id, title) {
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