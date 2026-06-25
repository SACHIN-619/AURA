import Booking  from '../models/Booking.js';
import User     from '../models/User.js';
import Salon    from '../models/Salon.js';
import Analytics from '../models/Analytics.js';
import { awardXp } from '../utils/xp.js';

const now = () => new Date();
const today = () => now().toISOString().split('T')[0];

export const createBooking = async (req,res) => {
  const {salonId,customerName,customerEmail,customerPhone,service,date,timeSlot,notes,aiAssisted,mirrorUsed} = req.body;
  if(!salonId||!customerName||!customerEmail||!service||!date||!timeSlot)
    return res.status(400).json({success:false,error:'Missing required fields: salonId, customerName, customerEmail, service, date, timeSlot'});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
    return res.status(400).json({success:false,error:'Invalid email address'});
  try {
    const salon = await Salon.findById(salonId).select('name hub').lean();
    if(!salon) return res.status(404).json({success:false,error:'Salon not found'});
    const booking = await Booking.create({
      salonId,salonName:salon.name,salonHub:salon.hub,
      customerName:customerName.trim(),customerEmail:customerEmail.toLowerCase().trim(),
      customerPhone,service,date,timeSlot,notes,status:'confirmed',
      aiAssisted:!!aiAssisted,mirrorUsed:!!mirrorUsed,
    });
    // Upsert user record silently — this may create a passwordless "shadow"
    // record for someone who never signed up, which is intentional (they
    // can claim it later via signup). XP is awarded separately below, only
    // if a REAL account (one with a password already set) exists, so we
    // never grant points to a shadow record nobody can actually log into.
    User.findOneAndUpdate({email:customerEmail.toLowerCase().trim()},{$set:{name:customerName.trim(),phone:customerPhone,lastActiveAt:now()},$inc:{totalBookings:1}},{upsert:true}).catch(()=>{});
    User.findOne({ email: customerEmail.toLowerCase().trim(), passwordHash: { $ne: null } })
      .select('_id')
      .then(realAccount => { 
        if (realAccount) {
          awardXp(User, realAccount._id, 'booking_request_sent'); 
          User.findByIdAndUpdate(realAccount._id, {
            $push: { activityLog: { action: `Booked Salon: ${salon.name}`, metadata: { salonId, service } } }
          }).catch(()=>{});
        }
      })
      .catch(() => {});
    // Track analytics
    Analytics.create({salonId,hub:salon.hub,event:'booking_created',date:today(),hour:now().getHours()}).catch(()=>{});
    return res.status(201).json({success:true,booking:{_id:booking._id,salonName:salon.name,salonHub:salon.hub,service,date,timeSlot,status:booking.status,createdAt:booking.createdAt},message:`Booking confirmed at ${salon.name} for ${date}`});
  } catch(e){ return res.status(500).json({success:false,error:e.message}); }
};

// getMyBookings removed — was an unauthenticated email-query-param lookup,
// the same vulnerability already fixed in userController.js. The secure
// equivalent is GET /api/users/profile (requires a valid JWT).

export const cancelBooking = async (req,res) => {
  try {
    const b = await Booking.findByIdAndUpdate(req.params.id,{status:'cancelled'},{new:true}).lean();
    if(!b) return res.status(404).json({success:false,error:'Booking not found'});
    return res.json({success:true,message:'Booking cancelled',booking:b});
  } catch(e){ return res.status(500).json({success:false,error:e.message}); }
};

export const getDashboard = async (req,res) => {
  const {salonId} = req.params;
  try {
    const todayStr = today();
    const [todayList,weekCount,allTime,topServices] = await Promise.all([
      Booking.find({salonId,date:todayStr,status:{$ne:'cancelled'}}).lean(),
      Booking.countDocuments({salonId,status:'confirmed',createdAt:{$gte:new Date(Date.now()-7*86400000)}}),
      Booking.countDocuments({salonId,status:{$ne:'cancelled'}}),
      Booking.aggregate([{$match:{salonId:new (await import('mongoose')).default.Types.ObjectId(salonId)}},{$group:{_id:'$service',count:{$sum:1}}},{$sort:{count:-1}},{$limit:3}]),
    ]);
    // No weekRevenue — we have no real pricing data, so we don't invent one.
    return res.json({success:true,dashboard:{todayBookings:todayList.length,weekBookings:weekCount,totalBookings:allTime,topService:topServices[0]?._id||'N/A',todayList:todayList.slice(0,5).map(b=>({customer:b.customerName,service:b.service,time:b.timeSlot,status:b.status}))}});
  } catch(e){ return res.status(500).json({success:false,error:e.message}); }
};

export const trackEvent = async (req,res) => {
  const {salonId,hub,event,metadata} = req.body;
  if(!event) return res.status(400).json({success:false,error:'event required'});
  try {
    await Analytics.create({salonId,hub,event,metadata,date:today(),hour:now().getHours()});
    return res.json({success:true});
  } catch{ return res.json({success:true}); } // never fail on analytics
};
