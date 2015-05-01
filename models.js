var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var bcrypt   = require('bcrypt-nodejs');

var userSchema = mongoose.Schema({
    "email": { type: String, required: true, index: { unique: true } },
    "fname": { type: String, required: true },
    "lname": { type: String, required: true },
    "password": { type: String, required: true },

	"fb_id" : { type: String },
	"ig_id" : { type: String },
	"tw_id" : { type: String },
	"gg_id" : { type: String },

	"ig_access_token": { type: String },
	"fb_access_token": { type: String },
	"tw_access_token": { type: String },
	"gg_access_token": { type: String },

	"ig_exist": { type: Boolean },
	"fb_exist": { type: Boolean },
	"tw_exist": { type: Boolean },
	"gg_exist": { type: Boolean }
});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};


exports.User = mongoose.model('User', userSchema);
