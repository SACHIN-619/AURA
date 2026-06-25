import mongoose from 'mongoose';
const BookingSchema = new mongoose.Schema({
  salonId: { type: String, required: true, index: true },
  salonName: { type: String, required: true },
  salonHub:  { type: String, required: true },
  customerName:  { type: String, required: true, trim: true, maxlength: 80 },
  customerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
  customerPhone: { type: String, trim: true },
  service:  { type: String, required: true },
  date:     { type: String, required: true },
  timeSlot: { type: String, required: true },
  notes:    { type: String, maxlength: 500 },
  status:   { type: String, enum: ['pending','confirmed','cancelled','completed'], default: 'pending', index: true },
  aiAssisted:  { type: Boolean, default: false },
  mirrorUsed:  { type: Boolean, default: false },
  priceSnapshot: { type: Number },
}, { timestamps: true, versionKey: false });
BookingSchema.index({ salonId: 1, date: 1, status: 1 });
export default mongoose.model('Booking', BookingSchema);
