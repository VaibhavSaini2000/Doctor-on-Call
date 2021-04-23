var mongoose = require('mongoose');
//var validator = require('validator');

const prescriptionSchema = new mongoose.Schema({
    patientid :{
        type: mongoose.ObjectId,
        required : true,
        unique : 1
    },
    title:{
        type: String,
        required: true,
        maxlength: 100,
        trim: true
    },
    consult_date:{
        type: Date,
        required: true,
        default: () => new Date(+new Date() + 7*24*60*60*1000)      //No overhead charges for next 7 days
    },
    amount_charged:{
        type: Number,
        required: true,
        min: 1, 
        max: 500, 
        default: 500,
        validate: {
            validator : function(value) {
                //return (value.length >500) | (value.length < 1); 
                
                if(value>500 | value < 1) {
                    throw new Error("Value of amount_charged must be between 1 and 500.");
                }
                
            },
            //message : "Value of amount_charged must be between 1 and 500."
        } 
    },
    image:{
        type : String,
        required : true
    }
});

//Creating a collection
const Prescription = new mongoose.model("Prescription",prescriptionSchema);

module.exports = Prescription;