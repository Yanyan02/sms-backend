
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'
import { log } from 'winston'

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
      supplier: object_id,
      items: Joi.array().items(
        Joi.object({
          description: Joi.string(),
          unit: Joi.string(),
          quantity: Joi.number(),
          cost: Joi.number()
        })
      ),
      requested_by: Joi.string(),
      date_requested: Joi.date(),
      delivery : Joi.boolean()
    },
    "get-purchase-request": {
   project: Joi.string().allow(""),
    type: Joi.string().allow(""),
    year:  Joi.string().allow(""),
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
 

  // Fetch project details
  const project = await this.db?.collection("projects").findOne({ _id: new ObjectId(data.project) });

  if (!project) {
    throw new Error("Invalid project ID. Project not found.");
  }
  const sequence = (project.purchase_request_no || 0) + 1;

  // Generate PR number
  // const currentYear = new Date().getFullYear();
  // const controlNumber = project.control_number || "XX"; 
  // const formCode = "PR"; 
  // const prNumber = `${controlNumber}-${formCode}-${currentYear}-${String(sequence).padStart(4, "0")}`;
  const prNumber = `${String(sequence).padStart(4, "0")}`;

  await this.db?.collection("projects").updateOne(
    { _id: new ObjectId(data.project) },
    { $set: { purchase_request_no: sequence } }
  );

  
  data.no = prNumber;
  data.date_requested = new Date(data.date_requested);
  data.project = new ObjectId(data.project);
  data.supplier = new ObjectId(data.supplier);

  const result = await this.db?.collection(collection).insertOne(data);

  if (!result.insertedId) {
    throw new Error("Could not create purchase request.");
  }

  return { message: "Successfully created purchase request", prNumber };
},
async get_purchase_request(filter: any) {  
  console.log("FIlerrrrrrrrrr", filter);

  const { project, type, year } = filter;
  const query: any = {};

  if (project) {
    query.project = new ObjectId(project);
  }


  if (year) {
    const [yearPart, monthPart] = year.split('-'); 

    const startDate = new Date(`${yearPart}-${monthPart}-01T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1); 

    if (type === 'stock-card') {
      console.log("HIiiiii");

      const result = await this.db?.collection("purchase-requests").aggregate(
        [
          {
            $match: {
              project: new ObjectId(project),
            },
          },
          {
            $lookup: {
              from: "suppliers",
              localField: "supplier",
              foreignField: "_id",
              as: "supplier",
            },
          },
          {
            $unwind: {
              path: "$supplier",
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $lookup: {
              from: "projects",
              localField: "project",
              foreignField: "_id",
              as: "project",
            },
          },
          {
            $unwind: {
              path: "$project",
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $set: {
              items: {
                $map: {
                  input: "$items",
                  as: "item",
                  in: {
                    $mergeObjects: [
                      "$$item",
                      { quantity: { $toInt: "$$item.quantity" } },
                    ],
                  },
                },
              },
            },
          },
          {
            $unwind: "$items",
          },
          {
            $match: {
              date_requested: {
                $gte: startDate,
                $lt: endDate,
              },
              "items.quantity": { $gte: 20 },
            },
          },
          {
            $project: {
              _id: 0,
              requested_by: 1,
              type : 1,
              supplier: "$supplier.name",
              project: "$project.name",
              address: "$project.address",
              items: "$items",
              date_requested: 1,
            },
          },
        ]
      ).toArray();
      console.log("RESULTTTT", result);
      return result;
    }
  } else {
   if(type === 'purchase-request'){
    console.log("REQUESTTTTTTTTTTTTTTTTTTT");
    
      const result =  this.db?.collection("purchase-requests").aggregate([
                      {
                    $match: {
                    project: new ObjectId(project),
                    }
                    },
                    {
                      $lookup: {
                        from: "suppliers",
                        localField: "supplier",
                        foreignField: "_id",
                        as: "supplier"
                      }
                    },
                    { $unwind: "$supplier" },
                    {
                      $lookup: {
                        from: "projects",
                        localField: "project",
                        foreignField: "_id",
                        as: "project"
                      }
                    },
                    { $unwind: "$project" },
                    {
                      $group: {
                        _id: {
                          date_requested: "$date_requested"
                        },
                        items: { $push: "$items" },
                        supplier: { $first: "$supplier.name" },
                        project: { $first: "$project.name" },
                        address: { $first: "$project.address" },
                        control_number: { $first: "$project.control_number" }, 
                        requested_by: { $first: "$requested_by" },
                        type: { $first: "$type" },
                        delivery: { $first: "$delivery" }
                      }
                    },
                    {
                      $project: {
                        _id: 0,
                        date_requested: "$_id.date_requested",
                        supplier: 1,
                        project: 1,
                        address: 1,
                        control_number: 1,
                        requested_by: 1,
                        type: 1,
                        delivery: 1,
                        items: {
                          $reduce: {
                            input: "$items",
                            initialValue: [],
                            in: { $concatArrays: ["$$value", "$$this"] }
                          }
                        }
                      }
                    }
                    // {
                    //   $lookup: {
                    //     from: "suppliers",
                    //     localField: "supplier",
                    //     foreignField: "_id",
                    //     as: "supplier"
                    //   }
                    // },
                    // { $unwind: "$supplier" },
                    // {
                    //   $lookup: {
                    //     from: "projects",
                    //     localField: "project",
                    //     foreignField: "_id",
                    //     as: "project"
                    //   }
                    // },
                    // { $unwind: "$project" },
                  
                    // {
                    //   $group: {
                    //     _id: {
                    //       date_requested: "$date_requested"
                    //     },
                    //     items: { $push: "$items" }, 
                    //     supplier: { $first: "$supplier.name" },
                    //     project: { $first: "$project.name" },
                    //     address: { $first: "$project.address" },
                    //     requested_by: { $first: "$requested_by" },
                    //     type: { $first: "$type" },
                    //     delivery: { $first: "$delivery" }
                    //   }
                    // },
                    // {
                    //   $project: {
                    //     _id: 0,
                    //     date_requested: "$_id.date_requested",
                    //     supplier: 1,
                    //     project: 1,
                    //     address: 1,
                    //     requested_by: 1,
                    //     type: 1,
                    //     delivery: 1,
                    
                    //     items: {
                    //       $reduce: {
                    //         input: "$items",
                    //         initialValue: [],
                    //         in: { $concatArrays: ["$$value", "$$this"] }
                    //       }
                    //     }
                    //   }
                    // }
                    ]).toArray()
                    return result
                  } else {
                    console.log("NOTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTtttt");
                   const result =  this.db?.collection("purchase-requests").aggregate([
                    {
                      $match: {
                     project: new ObjectId(project),
                      }
                    },
                    {
                      $lookup: {
                        from: "projects",
                        localField: "project",
                        foreignField: "_id",
                        as: "project",
                      },
                    },
                    {
                      $unwind: { path: "$project", preserveNullAndEmptyArrays: true },
                    },
                    {
                      $lookup: {
                        from: "suppliers",
                        localField: "supplier",
                        foreignField: "_id",
                        as: "supplier",
                      },
                    },
                    {
                      $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true },
                    },
                    {
                      $project: {
                        items: 1,
                        no: 1,
                        project: "$project.name",
                        address: "$project.address",
                        date_requested: 1,
                        requested_by: 1,
                        type: 1,
                        control_number: "$project.control_number",
                        supplier: "$supplier.name",
                      },
                    },
                  ]).toArray();
                  return result
                  }
  }
},

async get_purchase_request_id(id: any) {
console.log("IDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD");

 return this.db?.collection("purchase-requests").aggregate([
    {
  $match: {
    _id : new ObjectId(id)
  }
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
      $lookup: {
        from: "suppliers",
        localField: "supplier",
        foreignField: "_id",
        as: "supplier",
      },
    },
    { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } }, 
    {
      $project: {
        items: 1,
        no: 1,
        project: "$project.name",
        address: "$project.address",
        date_requested: 1,
        requested_by: 1,
        type : 1,
        control_number: "$project.control_number",
        supplier : "$supplier.name"
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