const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const store = {};

function matchesFilter(doc, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const key of Object.keys(filter)) {
    const val = filter[key];
    const docVal = doc[key];
    const docValStr = (docVal && docVal._id) ? String(docVal._id) : String(docVal);
    const valStr = (val && val._id) ? String(val._id) : String(val);
    if (val !== undefined && docValStr !== valStr) {
      return false;
    }
  }
  return true;
}

class MockQuery {
  constructor(docs, isSingle = false) {
    this.docs = docs;
    this.isSingle = isSingle;
    this.sortOpts = null;
    this.populatePaths = [];
  }

  sort(opts) {
    this.sortOpts = opts;
    return this;
  }

  select(fields) {
    return this;
  }

  populate(path) {
    this.populatePaths.push(path);
    return this;
  }

  exec() {
    return this.then();
  }

  then(onResolve, onReject) {
    let result = this.docs;

    if (this.sortOpts && Array.isArray(result)) {
      const field = Object.keys(this.sortOpts)[0];
      const direction = this.sortOpts[field];
      result = [...result].sort((a, b) => {
        const valA = a[field] !== undefined ? a[field] : 0;
        const valB = b[field] !== undefined ? b[field] : 0;
        if (valA < valB) return direction === -1 ? 1 : -1;
        if (valA > valB) return direction === -1 ? -1 : 1;
        return 0;
      });
    }

    if (this.populatePaths.length > 0 && Array.isArray(result)) {
      result = result.map(doc => {
        const docCopy = doc.toObject ? doc.toObject() : { ...doc };
        for (const path of this.populatePaths) {
          const refModelName = path === 'courseId' ? 'Course' : (path === 'userId' ? 'User' : null);
          if (refModelName && docCopy[path]) {
            const refId = String(docCopy[path]);
            const refDoc = store[refModelName]?.find(d => String(d._id) === refId);
            if (refDoc) {
              docCopy[path] = refDoc;
            }
          }
        }
        return docCopy;
      });
    }

    if (this.isSingle) {
      result = Array.isArray(result) && result.length > 0 ? result[0] : null;
    }

    const promise = Promise.resolve(result);
    if (onResolve) {
      return promise.then(onResolve, onReject);
    }
    return promise;
  }

  catch(onReject) {
    return this.then().catch(onReject);
  }
}

const activateMockMode = () => {
  console.log("\n⚡ [Offline Mode] Activating In-Memory Mongoose Mock Database...");

  mongoose.Model.find = function(filter) {
    const modelName = this.modelName;
    const collection = store[modelName] || [];
    const matched = collection.filter(doc => matchesFilter(doc.toObject ? doc.toObject() : doc, filter));
    return new MockQuery(matched);
  };

  mongoose.Model.findOne = function(filter) {
    const modelName = this.modelName;
    const collection = store[modelName] || [];
    const matched = collection.filter(doc => matchesFilter(doc.toObject ? doc.toObject() : doc, filter));
    return new MockQuery(matched, true);
  };

  mongoose.Model.findById = function(id) {
    const modelName = this.modelName;
    const collection = store[modelName] || [];
    const matched = collection.filter(doc => String(doc._id) === String(id));
    return new MockQuery(matched, true);
  };

  mongoose.Model.countDocuments = function(filter) {
    const modelName = this.modelName;
    const collection = store[modelName] || [];
    const matched = collection.filter(doc => matchesFilter(doc.toObject ? doc.toObject() : doc, filter));
    return Promise.resolve(matched.length);
  };

  mongoose.Model.create = async function(data) {
    const createDoc = async (item) => {
      const doc = new this(item);
      await doc.save();
      return doc;
    };

    if (Array.isArray(data)) {
      const results = [];
      for (const item of data) {
        results.push(await createDoc(item));
      }
      return results;
    } else {
      return await createDoc(data);
    }
  };

  mongoose.Model.insertMany = async function(data) {
    return this.create(data);
  };

  mongoose.Model.prototype.save = async function() {
    const modelName = this.constructor.modelName;
    
    if (!this._id) {
      this._id = new mongoose.Types.ObjectId();
    }

    if (modelName === 'User' && this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }

    if (this.schema.options.timestamps) {
      const createdAtName = this.schema.options.timestamps.createdAt || 'createdAt';
      const updatedAtName = this.schema.options.timestamps.updatedAt || 'updatedAt';
      if (!this[createdAtName]) this[createdAtName] = new Date();
      this[updatedAtName] = new Date();
    }

    if (!store[modelName]) {
      store[modelName] = [];
    }

    const collection = store[modelName];
    const idx = collection.findIndex(d => String(d._id) === String(this._id));
    if (idx !== -1) {
      collection[idx] = this;
    } else {
      collection.push(this);
    }
    store[modelName] = collection;
    
    return this;
  };

  console.log("✅ In-Memory Mongoose Mock Database activated successfully.");
};

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/signa";
    console.log(`Connecting to MongoDB: ${uri.replace(/\/\/.*@/, '//<credentials>@')}...`);
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    activateMockMode();
  }
};

module.exports = connectDB;
