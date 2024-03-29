import { object_id, handle_res } from "@lib/api-utils.mjs";
import Joi from "joi";
import {ObjectId} from "mongodb";
import { generateKeyPair, createPublicKey } from "node:crypto";
import { REST } from "sfr";

import Grant from "@lib/grant.mjs";
import multers from "@lib/multers.mjs";

import { assemble_upload_params, create_key_pair, create_public_key } from "@utils/index.mjs";
import grant_def from "@lib/setup/grant-def.mjs";

const { UAC_PASSPHRASE } = process.env;

const icon = multers["domain-logo"];

export default REST({
  cfg : {
    base_dir : "admin",

    service : "Identity Access Management"
  },
  
  validators : {
    "create-domain": icon.single("domain-logo"),
    
    "get-subdomains": {
      domain_id: object_id,
    },
    "create-subdomain": {
      domain_id: object_id,
      subdomain: {
        name: Joi.string().required(),
        desc: Joi.string(),
      },
    },
    "update-subdomain": {
      domain_id: object_id,
      subdomain: {
        name: Joi.string(),
        desc: Joi.string(),
      },
    },
    "delete-subdomain": {
      subdomain_id: object_id,
    },
    "create-page" : {
      domain_id : object_id,
      page : {
        name : Joi.string().required(),
        path : Joi.string()
      }
    },
    "get-resources": {
      domain_id: object_id,
    },
    "resource-assignment" : {
      parent : object_id,
      child  : object_id
    },

    "delete-resource" : {
      resource_id : object_id
    },

    "get-resources-by-domain" : {
      domain_id : object_id
    },

    "get-domain-public-key" : {
      domain_id : object_id
    }
  },

  handlers   : {
    GET : {
      "get-resources"(req, res) {
        handle_res(this.get_resources(req.query.domain_id), res);
      },
      "get-subdomains"(req, res) {
        handle_res(this.get_subdomains(req.query.domain_id), res);
      },

      async "get-domain-public-key"(req, res){
        const { domain_id } = req.query;
        
        const domain = await this.get_domain(domain_id);
        if(!domain)return res.status(400).json({error : "No such domain."});

        res.json({data : create_public_key(domain.key)});
      }
    },
    POST : {
      "create-domain"(req, res){
        const name = req.body["domain-name"];
        if(!UAC_PASSPHRASE)return res.status(400).json({error : "Failed to create domain, issuance of keypairs failed due to server misconfiguration."});

        create_key_pair()
        .then(({public_key, private_key})=> {
          this.create_domain(name, private_key)
          .then(()=>{
            this.spaces.std.upload(assemble_upload_params(name, req.file!, "public"));
            grant_def();
            res.json({data : public_key});
          });
        })
        .catch(()=>{
          res.status(400).json({error : "Failed to create domain, exception encountered when generating keypair."})
        })
      },

      "create-subdomain"(req, res) {
        const { domain_id, subdomain } = req.body;
        this.create_subdomain(domain_id, subdomain)
        .then(() => {
          res.json({ data: "Successfully created subdomain." });
          grant_def();
        })
        .catch((error) => res.status(400).json({ error }));
        Grant.set_state(false);
      },
      "create-page"(req, res){
        const { domain_id, page } = req.body;
        this.create_page(domain_id, page)
        .then(()=> {
          res.json({data : "Successfully created page."});
          grant_def();
        })
        .catch((error)=> res.status(400).json({error}));
        Grant.set_state(false);
      },
      "resource-assignment"(req, res){
        const { parent, child } = req.body;
        this.assign_resource(parent, child)
        .then(()=> {
          res.json({data : "Successfully assigned resource."});
          grant_def();
        })
        .catch(()=> res.status(400).json({error : "Failed to assign resource, resource has already been assigned."}));
        Grant.set_state(false);
      }
    },

    DELETE : {
      "delete-resource"(req, res){
        
        this.delete_resource(req.body.resource_id)
        .then(()=> {
          res.json({data : "Successfully deleted resource."});
          grant_def();
        })
        .catch((error)=> res.json({error}));
      }
    }
  },

  controllers : {
    async get_resources(domain_id) {
      const resources = await this.db.collection("resources").find({ domain_id: new ObjectId(domain_id) }).toArray();
      const resource_map = Object.fromEntries(resources.map((v)=> [v._id.toString(), v]));
      function resolve_resources(item : any){
        if(!item.resources || !item.resources.length)return item;
        return {...item, resources : item.resources.map((v : string)=> {
          const res = resource_map[v.toString()];

          if(res)resolve_resources(res)
        })}
      }

      return resources.map(resolve_resources);
    },

    get_domain(domain_id){
      return this.db.collection("domains").findOne({_id : new ObjectId(domain_id)});
    },
    get_subdomains(domain_id) {
      return this.db
        .collection("resources")
        .find({ domain_id: new ObjectId(domain_id), type: "subdomain" })
        .toArray();
    },

    create_domain(name : string, key : string){
      const domain = this.db.collection("domains").findOne({name});
      if(!domain)return Promise.reject("Failed to create domain, domain name already taken.");

      return this.db.collection("domains").insertOne({name, key});
    },
    async create_subdomain(domain_id, subdomain) {
      let temp = await this.db
        .collection("resources")
        .find({
          domain_id: new ObjectId(domain_id),
          type: "subdomain",
          name: subdomain.name,
        })
        .toArray();
      if (temp.length)
        return Promise.reject(
          "Failed to create subdomain, subdomain already exists."
        );

      return this.db.collection("resources").insertOne({
        domain_id: new ObjectId(domain_id),
        type: "subdomain",
        resources : [],
        ...subdomain,
      });
    },
    async delete_subdomain(subdomain_id) {
      let temp = await this.db
        .collection("resources")
        .deleteOne({ _id: new ObjectId(subdomain_id) });

      if (!temp.deletedCount)
        return Promise.reject(
          "Failed to delete subdomain, subdomain not found."
        );
      return Promise.resolve(true);
    }, 
    async create_page(domain_id, page){
      const temp = await this.db.collection("resources").findOne({ type : "page", domain_id : new ObjectId(domain_id), name : page.name});
      if(temp)return Promise.reject("Failed to create page, page already exists.");

      return this.db.collection("resources").insertOne({
        domain_id : new ObjectId(domain_id),
        type      : "page",
        resources : [],
        ...page
      });
    },
    delete_resource(resource_id){
      return this.db.collection("resources").deleteOne({_id : new ObjectId(resource_id)})
      .then((v)=> {
        if(!v.deletedCount)return Promise.reject("Failed to delete resource, no such resource.");
      })
    },
    async assign_resource(parent, child){
      const temp = await this.db.collection("resources").find({$or : [{_id : new ObjectId(parent)}, {_id : new ObjectId(child)}]}).toArray();
      if(temp.length !== 2)return Promise.reject("Failed to assign resource, both resource must exist.");
      
      return this.db.collection("resources").updateOne({_id : new ObjectId(parent)}, { $addToSet : {resources : new ObjectId(child) } });
    }
  }
});