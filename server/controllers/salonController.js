import Salon from '../models/Salon.js';

export const getSalons = async (req,res) => {
  try {
    const {hub,category,gender,page=1,limit=24,sort='name'} = req.query;
    const filter = {};
    if(hub) filter.hub = new RegExp(hub,'i');
    // Filter by real OSM-derived category, not a fabricated price tag
    if(category) filter.serviceCategories = category;
    if(gender && gender !== 'any') filter.servesGender = gender;
    const skip = (parseInt(page)-1)*parseInt(limit);
    // Default sort is alphabetical by name — we do NOT sort by luxuryRating
    // since it's a synthetic placeholder, not a real ranking signal.
    const [salons,total] = await Promise.all([
      Salon.find(filter).select('-__v').sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      Salon.countDocuments(filter),
    ]);
    return res.json({success:true,data:salons,meta:{total,page:parseInt(page),limit:parseInt(limit),totalPages:Math.ceil(total/parseInt(limit))}});
  } catch(e){ return res.status(500).json({success:false,error:e.message}); }
};

export const getSalonById = async (req,res) => {
  try {
    const s = await Salon.findById(req.params.id).lean();
    if(!s) return res.status(404).json({success:false,error:'Salon not found'});
    return res.json({success:true,data:s});
  } catch(e){ return res.status(500).json({success:false,error:e.message}); }
};

export const getNearbySalons = async (req,res) => {
  try {
    const {lon,lat,radius=5000} = req.query;
    if(!lon||!lat) return res.status(400).json({success:false,error:'lon and lat required'});
    const salons = await Salon.find({location:{$near:{$geometry:{type:'Point',coordinates:[parseFloat(lon),parseFloat(lat)]},$maxDistance:parseInt(radius)}}}).limit(20).lean();
    return res.json({success:true,data:salons,count:salons.length});
  } catch(e){ return res.status(500).json({success:false,error:e.message}); }
};

export const getFeatured = async (req,res) => {
  try {
    // "Featured" is now driven by isFeatured flag (manually curated /
    // future owner-submitted) rather than a fake rating threshold, since
    // luxuryRating has no real signal behind it yet.
    const salons = await Salon.find({isFeatured:true}).limit(6).lean();
    return res.json({success:true,data:salons});
  } catch(e){ return res.status(500).json({success:false,error:e.message}); }
};

// export const getHubs = async (req,res) => {
//   try {
//     // Centroid is the AVERAGE of every synced salon's real GPS coordinate
//     // in that hub — computed live from MongoDB, no static lookup table.
//     const hubs = await Salon.aggregate([
//       {$group:{
//         _id:'$hub',
//         count:{$sum:1},
//         avgLat:{$avg:{$arrayElemAt:['$location.coordinates',1]}},
//         avgLon:{$avg:{$arrayElemAt:['$location.coordinates',0]}},
//       }},
//       {$sort:{count:-1}},
//       {$project:{hub:'$_id',count:1,lat:{$round:['$avgLat',5]},lon:{$round:['$avgLon',5]},_id:0}},
//     ]);
//     return res.json({success:true,data:hubs});
//   } catch(e){ return res.status(500).json({success:false,error:e.message}); }
// };

// server/controllers/salonController.js
export const getHubs = async (req, res) => {
  try {
    // 100% Dynamic: Pulls exactly whatever hubs currently have data inside your database collection!
    const uniqueHubs = await Salon.distinct('hub');
    const uniqueCities = await Salon.distinct('address.city');

    res.json({ 
      success: true, 
      data: {
        hubs: uniqueHubs,     // Returns ['Jubilee Hills', 'Gachibowli', ...] dynamically
        cities: uniqueCities  // Returns ['Hyderabad', ...] dynamically
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};