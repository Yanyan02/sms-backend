
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'

const collection = "purchase-requests"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {
    "create-purchase-request": {
      no: Joi.string(),
      project: object_id,
      type: Joi.string(),
      items: Joi.array().items(
        Joi.object({
          description: Joi.string(),
          unit: Joi.string(),
          quantity: Joi.number(),
          cost: Joi.number()
        })
      ),
      requested_by: Joi.string(),
      date_requested: Joi.date()
    },
    "get-purchase-request": {
   project: Joi.string().allow(""),
    type: Joi.string().allow(""),
    },
    "get-purchase-request-id": {
    id: object_id
    },
    "update-purchase-request": {
      _id: object_id,
      title: Joi.string()
    },
  },
  handlers: {
    "POST": {
      "create-purchase-request"(req, res) {
        console.log("Reqqqqqqqq", req.body);
        this.create_purchase_request(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(500).json({ error }));
      },
    },
    "GET": {
      "get-purchase-request"(req, res) {
        this.get_purchase_request(req.query).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
            "get-purchase-request-id"(req, res) {
        this.get_purchase_request_id(req.query).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    },
    "PUT": {
      "update-purchase-request"(req, res) {
        const { _id, title } = req.body
        this.update_purchase_request(_id, title).then(() => res.json({ data: "Successfully Update purchase-request" }))
          .catch((error) => res.status(400).json({ error }))
      }
    }
  },
  controllers: {
   async create_purchase_request(data) {
  console.log("Received Data:", data);

  // Fetch project details
  const project = await this.db?.collection("projects").findOne({ _id: new ObjectId(data.project) });

  if (!project) {
    throw new Error("Invalid project ID. Project not found.");
  }

  // Get and increment the purchase request number
  const sequence = (project.purchase_request_no || 0) + 1;

  // Generate PR number
  const currentYear = new Date().getFullYear();
  const controlNumber = project.control_number || "XX"; // Default if not available
  const formCode = "PR"; // Static form code
  const prNumber = `${controlNumber}-${formCode}-${currentYear}-${String(sequence).padStart(4, "0")}`;


  await this.db?.collection("projects").updateOne(
    { _id: new ObjectId(data.project) },
    { $set: { purchase_request_no: sequence } }
  );

  // Add PR number to the request
  data.no = prNumber;
  data.date_requested = new Date();
  data.project = new ObjectId(data.project);
  // Insert purchase request
  const result = await this.db?.collection(collection).insertOne(data);

  if (!result.insertedId) {
    throw new Error("Could not create purchase request.");
  }

  return { message: "Successfully created purchase request", prNumber };
},
async get_purchase_request(filter: any) {
  console.log("Filyerrrr", filter);
  
const { project, type } = filter;
 let query = {};
 if(project && type){
  query = {
    project : new ObjectId(project),
    type : type
  }
 }
  if(project){
  query = {
    project : new ObjectId(project),
  }
 }
  if(type){
  query = {
    type : type
  }
 }
 console.log('QUERRRTTTTTTTTTTTTT', query);
 
 return this.db?.collection("purchase-requests").aggregate([
    {
  $match: query
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
async get_purchase_request_id(id: any) {

 return this.db?.collection("purchase-requests").aggregate([
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





    async update_purchase_request(id, title) {
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