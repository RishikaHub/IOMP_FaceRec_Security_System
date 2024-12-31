const mongoose=require("mongoose")
mongoose.set("debug",true)
mongoose.Promise=Promise;
mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://lokig090807:sSSPe1m93Tzb0bk4@facerecog.hal6m.mongodb.net/",{
    keepAlive:true,
    // useMongoClient:true
    useNewUrlParser: true,
    useUnifiedTopology: true
})

module.exports.Workshops=require("./workshop")
module.exports.Hackathons=require("./hackathon")
module.exports.Colabs=require("./colab")
module.exports.User = require("./user") 