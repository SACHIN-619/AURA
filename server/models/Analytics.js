import mongoose from 'mongoose';
const AnalyticsSchema = new mongoose.Schema({
  salonId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Salon', index: true },
  hub:      { type: String, index: true },
  event:    { type: String, enum: ['view','booking_created','route_click','ai_search','mirror_used'], required: true, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  date:     { type: String, index: true },
  hour:     { type: Number, min: 0, max: 23 },
}, { timestamps: true, versionKey: false });
AnalyticsSchema.index({ salonId: 1, event: 1, date: 1 });
export default mongoose.model('Analytics', AnalyticsSchema);
