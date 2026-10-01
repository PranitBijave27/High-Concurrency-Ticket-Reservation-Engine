const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req,res,next)=>{
  try{
    const header = req.headers.authorization;

    if(!header || !header.toLowerCase().startsWith("bearer "))
      return res.status(401).json({error:"Unauthorized"});

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if(!user)
      throw new Error("User not found");

    req.user = user;
    next();

  }catch(err){
    const message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    res.status(401).json({ success: false, message, error: message });
  }
};

module.exports = authMiddleware;
