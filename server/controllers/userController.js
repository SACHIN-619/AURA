import User    from '../models/User.js';
import Booking from '../models/Booking.js';
import Rating  from '../models/Rating.js';

export const upsertUser = async (req,res) => {
  const {email,name,phone,marketingConsent} = req.body;
  if(!email||!name) return res.status(400).json({success:false,error:'email and name required'});
  try {
    const user = await User.findOneAndUpdate(
      {email:email.toLowerCase().trim()},
      {$set:{name:name.trim(),phone,lastActiveAt:new Date(),...(marketingConsent!==undefined&&{marketingConsent})},$setOnInsert:{email:email.toLowerCase().trim()}},
      {upsert:true,new:true,runValidators:true}
    );
    const {_id,email:e,name:n,phone:p,preferredHubs,preferredServices,totalBookings,createdAt} = user;
    return res.json({success:true,user:{_id,email:e,name:n,phone:p,preferredHubs,preferredServices,totalBookings,createdAt}});
  } catch(e){ return res.status(500).json({success:false,error:e.message}); }
};

// Requires a valid JWT (see userRoutes.js requireAuth). Uses the email from
// the verified token, NOT a client-supplied query param — the old version
// let anyone view anyone else's booking history just by knowing their
// email address. Now you can only ever see your own.
export const getProfile = async (req,res) => {
  const email = req.user?.email;
  if(!email) return res.status(401).json({success:false,error:'Not authenticated'});
  try {
    const [user,bookings,ratings] = await Promise.all([
      User.findOne({email}).lean(),
      Booking.find({customerEmail:email}).sort({createdAt:-1}).limit(20).lean(),
      Rating.find({customerEmail:email}).sort({createdAt:-1}).limit(20).populate('salonId','name hub').lean(),
    ]);
    if(!user) return res.status(404).json({success:false,error:'User not found'});
    return res.json({success:true,user,bookings,ratings});
  } catch(e){ return res.status(500).json({success:false,error:e.message}); }
};

// Requires a valid JWT — you can only delete YOUR OWN account. The old
// version let anyone delete any account just by sending that email in the
// request body, with zero verification it was actually them.
export const deleteUser = async (req,res) => {
  const email = req.user?.email;
  if(!email) return res.status(401).json({success:false,error:'Not authenticated'});
  try {
    await User.deleteOne({email});
    await Booking.updateMany({customerEmail:email},{$set:{customerEmail:'deleted@aura.in',customerName:'Deleted User',customerPhone:''}});
    return res.json({success:true,message:'User data deleted (GDPR)'});
  } catch(e){ return res.status(500).json({success:false,error:e.message}); }
};
