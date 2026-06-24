// server/controllers/searchController.js
// Autocomplete search — real fields only, no fake rating sort
import Salon from '../models/Salon.js';

export const autocomplete = async (req,res) => {
  const {q='',hub=''} = req.query;
  const query = q.trim();
  if(!query||query.length<2) return res.json({success:true,results:[]});
  try {
    const filter = {$or:[
      {name:{$regex:query,$options:'i'}},
      {hub:{$regex:query,$options:'i'}},
      {'address.suburb':{$regex:query,$options:'i'}},
    ]};
    if(hub) filter.hub = {$regex:hub,$options:'i'};
    const salons = await Salon.find(filter)
      .select('name hub address.suburb serviceCategories servesGender')
      .sort('name')
      .limit(8)
      .lean();
    return res.json({
      success:true,
      results: salons.map(s=>({
        _id: s._id,
        name: s.name,
        hub: s.hub,
        suburb: s.address?.suburb || '',
        categories: s.serviceCategories || [],
        servesGender: s.servesGender || null,
      })),
    });
  } catch { return res.json({success:true,results:[]}); }
};
