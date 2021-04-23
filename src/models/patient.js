// Mongoose schema defines the structure of the document,
// default values, validators, etc.
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const patientSchema = new mongoose.Schema({
    firstname:{
        type: String,
        required: true,
        maxlength: 100
    },
    lastname:{
        type: String,
        required: true,
        maxlength: 100
    },
    email:{
        type: String,
        required: true,
        trim: true,
        unique: 1,
        /*
        validate: {
            validator: function(value){             //no need to import validator for this method
                return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(value);
            },
            message: props => `${props.value} is not a valid email address!`
        }
        */
        validate(value) {
            if(!validator.isEmail(value)){
                throw new Error("Invalid Email Address!");
            }
        }
    },
    password:{
        type:String,
        required: true,
        minlength:8
    },
    tokens:[{
        token:{
            type:String,
            required: true
        }
    }]
});

//Instance Methods. newUser is an instance of Patient
patientSchema.methods.generateAuthToken = async function(req,res){
    try{
        const token = jwt.sign({_id:this._id.toString()},process.env.SECRET_KEY);       //toString() because _id is saved as ObjectId
        this.tokens = this.tokens.concat({token:token});
        await this.save();
        return token;
    }catch(error){
        //res.send(error);
        console.log(error);
        return error;
    }
}

patientSchema.pre("save", async function (next) {

    if(this.isModified("password")) {
        //console.log(`pre called for password ${this.password}`);
        passwordHash = await bcrypt.hash(this.password,10);
        //console.log(`Hashed Password is ${passwordHash}`);
        this.password = passwordHash;
    }
    next();
});

//A Mongoose model is a wrapper on the Mongoose schema. 
//A Mongoose model provides an interface to the database 
//for creating, querying, updating, deleting records, etc.

//Creating a collection
const Patient = new mongoose.model('Patient',patientSchema);

module.exports = Patient;