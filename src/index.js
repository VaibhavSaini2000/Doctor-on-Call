require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const path = require("path");
const hbs = require("hbs");
const db=require('./database_config/database_config').get(process.env.NODE_ENV);
const Patient = require("./models/patient");
const Prescription = require("./models/prescription");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const auth = require("./middleware/auth");
const multer = require('multer');

const Storage = multer.diskStorage({
    destination:"./public/uploads/",
    filename:(req,file,cb)=>{
        cb(null,file.fieldname+"_"+Date.now()+path.extname(file.originalname));
    }
});

const upload = multer({
    storage : Storage
}).single('prescriptionImage');

const static_path = path.join(__dirname ,"../public");
const template_path = path.join(__dirname ,"../templates/views");
const partials_path = path.join(__dirname ,"../templates/partials");

// app use
app.use(express.urlencoded({extended : false}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(static_path));  
app.set('view engine', 'hbs');
app.set('views',template_path);
hbs.registerPartials(partials_path);

// database connection
mongoose.Promise=global.Promise;

mongoose.connect(db.DATABASE,{ 
    useNewUrlParser: true,
    useUnifiedTopology:true, 
    useFindAndModify : false,
    useCreateIndex: true 
})
.then( () => console.log("Connected to mongodb Database"))
.catch( (err) => console.log(err));

app.get('/',function(req,res){
    if(req.error) {
        res.render("index");
    } else {
        res.render("index",{error:req.error});
    }
});

app.post('/', async(req,res) => {
    try{
        const email = req.body.email;
        const password = req.body.password;
        const requestedpatient = await Patient.findOne({email:email});
        if(requestedpatient)
        {
            const passwordMatch = await bcrypt.compare(password,requestedpatient.password);
            
            //console.log(passwordMatch);
            
            if(passwordMatch)
            {
                const token = await requestedpatient.generateAuthToken();
                //console.log("Generated Token : "+token);
                res.cookie("jwt",token,{
                    expires: new Date(Date.now() + 6000000),
                    httpOnly: true//,
                    //secure: true
                });

                /*
                res.status(201).render("dashboard",{
                    firstname:requestedpatient.firstname,
                });
                */
                //req.session.firstname = requestedpatient.firstname;
                res.redirect('/dashboard');
            }
            else{
                res.status(400).render("index",{errormessage:`Invalid Credentials!`});
            }
        }
        else{
            res.status(400).render("index",{errormessage:`Invalid Credentials!`});
        }
    }catch(error){
        res.status(400).render("index",{errormessage:`Not able to log in . System encountered the following error = `+error});
    }
});

app.get('/register',function(req,res){
    res.render("signup");
});

app.post('/register',async(req,res) => {
    try{
        const password = req.body.password;
        const password2 = req.body.password2;

        if(password === password2)
        {
            const newUser = new Patient({
                firstname : req.body.firstname,
                lastname : req.body.lastname,
                email : req.body.email,
                password : password
            });

            const token = await newUser.generateAuthToken();
            //console.log("Generated Token : "+token);
            res.cookie("jwt",token,{
                expires: new Date(Date.now() + 300000),
                httpOnly: true,
                //secure: true
            });
            const result = await newUser.save();
            res.status(201).render("dashboard",result);
        }
        else {
            res.send("Passwords not matching");
        }
    }catch(error){
        res.status(400).send(`Not able to sign up . System encountered the following error = `+error);
    }
});

app.get('/dashboard', auth , async(req,res) => {
    try {
        //console.log(`Token saved in cookie ${req.cookies.jwt}`);
        if(req.patient)
        {
            var patient = req.patient;
            //console.log(patient._id);
            const result = await Prescription.find({patientid:patient._id});
            //console.log(result);
            var message = '';
            var doctormessage = '';
            if(result.length == 0)
            {
                message = 'No Prescriptions found yet.'
            }
            if(req.patient._id.toString() === "608324a7ba6f4835a88ec3b6")
            {
                doctormessage = 'Since you are a doctor. You can add prescriptions to your patient on localhost:3000/doctoraddprescription';
            }
            res.render("dashboard",{patient:patient , list:result , message : message , doctormessage : doctormessage});
        }
        else
        {
            req.error = "You are not logged in!";
            res.redirect("/");
        }
    } catch (error) {
        req.error = error;
        res.render("index",{error:error});
    }
});

app.get('/profile', auth , async(req,res) => {
    try {
        //console.log(`Token saved in cookie ${req.cookies.jwt}`);
        if(req.patient)
        {
            var patient = req.patient;
            res.render("profile",{patient:patient});
        }
        else
        {
            req.error = "You are not logged in!";
            res.redirect("/");
        }
    } catch (error) {
        req.error = error;
        res.render("index",{error:error});
    }
});

app.post('/profile', auth , async(req,res) => {
    try {
        //console.log(`Token saved in cookie ${req.cookies.jwt}`);
        if(req.patient)
        {
            var patient = req.patient;
            const updatedUser = await Patient.findByIdAndUpdate({_id : patient.id},{
                $set : {
                    firstname : req.body.firstname,
                    lastname: req.body.lastname,
                    email: req.body.email
                }
            },{
                new : true,
                useFindAndModify : false
            });

            res.render("profile",{patient:updatedUser,message:"Profile successfully Updated!"});
        }
        else
        {
            req.error = "You are not logged in!";
            res.redirect("/");
        }
    } catch (error) {
        req.error = error;
        res.render("index",{error:error});
    }
});

app.get('/logout', auth , async (req,res) => {
    try {
        req.patient.tokens = req.patient.tokens.filter((currTokenobj) => {
            return currTokenobj.token !== req.token;
        })
        res.clearCookie("jwt");
        await req.patient.save();
        res.redirect("/");
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/doctoraddprescription', auth , async(req,res) => {
    try {
        if(req.patient._id.toString() === "608324a7ba6f4835a88ec3b6")
        {
            console.log(req.patient._id.toString());
            var patient = req.patient;
            const patients = await Patient.find().select({_id : 1, email : 1});
            res.render("doctoraddprescription",{patient:patient,patients:patients});
        }
        else
        {
            req.error = "You are not doctor!";
            res.redirect("/");
        }
    } catch (error) {
        req.error = error;
        res.render("index",{error:error});
    }
});

app.post('/doctoraddprescription', [auth,upload] , async(req,res) => {
    try {
        //if(req.file)
        if(req.patient._id.toString() === "608324a7ba6f4835a88ec3b6")
        {
            console.log(req.file.filename);
            var patient = req.patient;
            const newPrescription = new Prescription({
                _id : req.body.patient,
                patientid : req.body.patient,
                title: req.body.title,
                consult_date: req.body.consult_date,
                amount_charged: req.body.amount_charged,
                image: req.file.filename
            })
    
            const result = await newPrescription.save(function(err,doc){
                if(err) throw err;
                else res.redirect("/dashboard");
            });
        }
        else
        {
            req.error = "Action not allowed.";
            res.redirect("/");
        }
    } catch (error) {
        req.error = error;
        res.render("index",{error:error});
    }
});

app.get('/prescription/:id', auth , async(req,res) => {
    try {
        console.log(req.params.id);
        var patient = req.patient;
        const prescription = await Prescription.findOne({_id : req.params.id}).select();
        console.log(prescription);
        res.render("prescription",{patient:patient,prescription:prescription});
    } catch (error) {
        req.error = error;
        res.render("index",{error:error});
    }
});

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>{
    console.log(`app is live at ${PORT}`);
});