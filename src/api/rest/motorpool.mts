
import { ObjectId } from 'mongodb'
import Joi from 'joi'
import { REST } from 'sfr'
import { object_id } from '@lib/api-utils.mjs'

const collection = "vehicles"

export default REST({
  cfg: {
    service: "MAIN",
    public: true
  },

  validators: {
    "create-vehicle": {
      date:  new Date(),
      type: Joi.string().valid('equipment', 'vehicle'),
      name: Joi.string(),
      id: Joi.string(),
      project: Joi.string().optional(),
      make: Joi.string(),
      serial_no: Joi.string(),
      brand: Joi.string(),
      model: Joi.string(),
      date_purchased: Joi.date(),
      other: Joi.string().allow('').optional(),
      pm_schedule: Joi.string(),
   
    
    },
    "get-vehicle": {
    },
    "get-checklist": {
    from: Joi.string().allow(""),
    to: Joi.string().allow(""),
    project: Joi.string().allow(""),
     vehicle: Joi.string().allow(""),
    },
   
  },
  handlers: {
    "POST": {
      "create-vehicle"(req, res) {
        this.create_vehicle(req.body)
          .then((data) => res.json({ data }))
          .catch((error) => res.status(500).json({ error }));
      },
     
    },
    "GET": {
      "get-vehicle"(req, res) {
        this.get_vehicle().then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
      "get-checklist"(req, res) {
        this.get_checklist(req.query).then((data) => res.json({ data })).catch((error) => res.status(400).json({ error }))
      },
    },
    "PUT": {
      "update-vehicle"(req, res) {
        const { _id, title } = req.body
        this.update_vehicle(_id, title).then(() => res.json({ data: "Successfully Update vehicle" }))
          .catch((error) => res.status(400).json({ error }))
      },
     
    }
  },
  controllers: {
   async create_vehicle(data) {
    if (data.date_purchased) {
      data.date_purchased = new Date(data.date_purchased);
    }
    if (data.project) {
      data.project = new ObjectId(data.project);
    }
    data.status = "available";
     const result = await this.db?.collection(collection).insertOne(data);
      if (!result.insertedId) return Promise.reject("Could not create vehicle");
      return Promise.resolve("Successfully created vehicle")
},

async get_vehicle() {
return this.db?.collection("vehicles").aggregate([
  {
    $lookup: {
      from: "projects",
      localField: "project",
      foreignField: "_id",
      as: "project"
    }
  },
  {
    $unwind: {
      path: "$project",
      preserveNullAndEmptyArrays: false
    }
  }
]).toArray();

},
async get_checklist(filter) {
  console.log("NGEEEEEEEEEEEE", filter)

  const [fromYear, fromMonth] = filter.from.split('-').map(Number)
  const [toYear, toMonth] = filter.to.split('-').map(Number)

  const start = new Date(Date.UTC(fromYear, fromMonth - 1, 1)) 
  const end = new Date(Date.UTC(toYear, toMonth, 0, 23, 59, 59, 999)) 

  const matchStage = {
    $match: {
      date: {
        $gte: start,
        $lte: end
      },
      ...(filter.project && { project: new ObjectId(filter.project) })
    }
  }

  return this.db?.collection("trip-tickets").aggregate([
    matchStage,
    {
      $lookup: {
        from: "vehicles",
        localField: "vehicle_id",
        foreignField: "_id",
        as: "vehicle"
      }
    },
    {
      $unwind: "$vehicle"
    },
    {
      $lookup: {
        from: "projects",
        localField: "project",
        foreignField: "_id",
        as: "project"
      }
    },
    {
      $unwind: "$project"
    },
     {
    $addFields: {
      year: { $year: "$ticket_date" },
      month: { $month: "$ticket_date" }
    }
  },
  {
    $group: {
      _id: {
        vehicle_id: "$vehicle_id",
        year: "$year",
        month: "$month"
      },
      vehicle: { $first: "$vehicle.name" },
      vehicle_id: { $first: "$vehicle.id" },
      project: { $first: "$project.name" },
      year: { $first: "$year" },
      month: { $first: "$month" },
      count: { $sum: 1 },
      records: { $push: "$$ROOT.checklist" }
    }
  },
  {
    $sort: {
      "year": 1,
      "month": 1
    }
  }
    // {
    //   $group: {
    //     _id: "$vehicle_id",
    //     vehicle: { $first: "$vehicle.name" },
    //     id: { $first: "$vehicle.id" },
    //     project: { $first: "$project.name" },
    //     count: { $sum: 1 },
    //     records: { $push: "$$ROOT.checklist" }
    //   }
    // }
  ]).toArray()
},
async update_vehicle(id, title) {
      const result = await this.db?.collection(collection).updateOne(
        { _id: new ObjectId(id) },
        { $set: { title: title } },
        { upsert: true }
      );
      if (result.matchedCount === 0) {
        return Promise.reject("Item not Found, Failed to Update!");
      }
      return result;
    },

  }
})