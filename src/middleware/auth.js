const jwt = require("jsonwebtoken");
const Patient = require("../models/patient");

const auth = async (req,res,next) => {
    try {
        const token = req.cookies.jwt;
        const verifyUser = await jwt.verify(token,process.env.SECRET_KEY);
        //console.log(verifyUser);

        const requestedpatient = await Patient.findOne({_id:verifyUser._id});
        //console.log(requestedpatient);

        req.token = token;
        req.patient = requestedpatient;

        next();
    } catch (error) {
        console.log(error);
        const err = error;
        req.error = err;
        res.send(error);
        next();
    }
}

module.exports = auth;